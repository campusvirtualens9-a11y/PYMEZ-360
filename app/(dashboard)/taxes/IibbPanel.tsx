'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createManualTreasuryEntry } from '@/lib/accounting/entries'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'

interface CashAccount {
  id: string
  name: string
  type: 'caja' | 'banco'
  balance: number
}

interface Props {
  companyId: string
  userId: string
  /** Cuenta 2.1.8 IIBB a pagar. Null si la empresa no la tiene en su plan. */
  iibbAccountId: string | null
  /** Saldo acreedor de 2.1.8: lo devengado y todavía no pagado. */
  saldoPendiente: number
  /** IIBB devengado en el mes en curso, para contrastar con la DDJJ. */
  devengadoMes: number
  periodo: string
  cashAccounts: CashAccount[]
}

export function IibbPanel({
  companyId,
  userId,
  iibbAccountId,
  saldoPendiente,
  devengadoMes,
  periodo,
  cashAccounts,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  const hoy = new Date().toISOString().slice(0, 10)

  const [open, setOpen]         = useState(false)
  const [date, setDate]         = useState(hoy)
  const [amount, setAmount]     = useState('')
  const [accountId, setAccountId] = useState(cashAccounts[0]?.id ?? '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const puedePagar = !!iibbAccountId && saldoPendiente > 0 && cashAccounts.length > 0

  function abrir() {
    setDate(hoy)
    setAmount(saldoPendiente.toFixed(2))
    setAccountId(cashAccounts[0]?.id ?? '')
    setError('')
    setOpen(true)
  }

  async function registrarPago() {
    const monto = parseFloat(amount)
    if (!monto || monto <= 0)  { setError('Ingresá un monto válido.'); return }
    if (!accountId)            { setError('Elegí de qué cuenta sale el pago.'); return }
    if (!iibbAccountId)        { setError('La empresa no tiene la cuenta 2.1.8 IIBB a pagar.'); return }
    if (monto > saldoPendiente + 0.005) {
      setError(`El monto supera la deuda registrada (${formatCurrency(saldoPendiente)}).`)
      return
    }

    const cuenta = cashAccounts.find(c => c.id === accountId)
    if (cuenta && Number(cuenta.balance) < monto) {
      setError(`Saldo insuficiente en ${cuenta.name}. Disponible: ${formatCurrency(Number(cuenta.balance))}`)
      return
    }

    setSaving(true)
    const concepto = `Pago IIBB — período ${periodo}`

    // Mismo circuito que un egreso de tesorería: movimiento, saldo y asiento.
    await supabase.from('cash_movements').insert({
      company_id: companyId,
      cash_account_id: accountId,
      date,
      type: 'egreso',
      amount: monto,
      concept: concepto,
      reference_type: 'manual',
      created_by: userId,
    })

    if (cuenta) {
      await supabase
        .from('cash_accounts')
        .update({ balance: Number(cuenta.balance) - monto })
        .eq('id', accountId)
    }

    // Debe 2.1.8 IIBB a pagar / Haber Caja o Banco: cancela el pasivo devengado.
    await createManualTreasuryEntry({
      companyId,
      date,
      amount: monto,
      type: 'egreso',
      cashAccountType: cuenta?.type ?? 'caja',
      counterpartAccountId: iibbAccountId,
      concept: concepto,
    })

    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
                Situación de tu empresa
              </p>
              <div className="flex gap-8 flex-wrap">
                <div>
                  <p className="text-xs text-slate-500">Devengado en {periodo}</p>
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(devengadoMes)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Generado por las ventas del mes</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Deuda acumulada sin pagar</p>
                  <p className={`text-xl font-bold ${saldoPendiente > 0 ? 'text-purple-700' : 'text-green-700'}`}>
                    {formatCurrency(saldoPendiente)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Saldo de la cuenta 2.1.8 IIBB a pagar</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Button onClick={abrir} disabled={!puedePagar}>
                Registrar pago del IIBB
              </Button>
              {!iibbAccountId && (
                <span className="text-[11px] text-amber-600">Falta la cuenta 2.1.8 en el plan</span>
              )}
              {iibbAccountId && saldoPendiente <= 0 && (
                <span className="text-[11px] text-green-600">No hay deuda pendiente</span>
              )}
              {iibbAccountId && saldoPendiente > 0 && cashAccounts.length === 0 && (
                <span className="text-[11px] text-amber-600">Creá una caja o banco en Tesorería</span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-relaxed mt-4">
            <span className="font-semibold text-slate-600">Cómo funciona:</span> el IIBB se devenga con cada venta
            (Debe <span className="font-mono">5.3.14</span> Impuesto sobre los Ingresos Brutos / Haber{' '}
            <span className="font-mono">2.1.8</span> IIBB a pagar), y queda como deuda hasta que lo pagás. Al registrar
            el pago se hace el asiento inverso sobre el pasivo: Debe <span className="font-mono">2.1.8</span> IIBB a
            pagar / Haber Caja o Banco. Por eso la deuda acumulada baja recién cuando pagás, no cuando vendés.
          </p>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar pago del IIBB">
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800">
            Deuda registrada: <strong>{formatCurrency(saldoPendiente)}</strong>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del pago</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Podés pagar una parte: la diferencia queda como deuda.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pagar desde</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {cashAccounts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatCurrency(Number(c.balance))}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={registrarPago} loading={saving}>
              Confirmar pago
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
