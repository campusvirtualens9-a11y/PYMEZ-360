'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createManualJournalEntry, createManualTreasuryEntry } from '@/lib/accounting/entries'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'

const COD_IVA_DEBITO  = '2.1.5'
const COD_IVA_CREDITO = '1.1.11'
const COD_IVA_A_PAGAR = '2.1.17'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

interface LineLike { account_id: string; debit: number; credit: number }
interface EntryLike { date: string; lines: LineLike[] }
interface AccountLike { id: string; code: string; name: string; type: string }
interface CashAccount { id: string; name: string; type: 'caja' | 'banco'; balance: number }

interface Props {
  entries: EntryLike[]
  accounts: AccountLike[]
  companyId: string
  userId: string
  cashAccounts: CashAccount[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function IvaLiquidacionPanel({ entries, accounts, companyId, userId, cashAccounts }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const hoy        = new Date()
  const hoyISO     = hoy.toISOString().slice(0, 10)
  const periodo    = `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`
  const prefijoMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  const cuentaDebito  = accounts.find(a => a.code === COD_IVA_DEBITO)  ?? null
  const cuentaCredito = accounts.find(a => a.code === COD_IVA_CREDITO) ?? null
  const cuentaAPagar  = accounts.find(a => a.code === COD_IVA_A_PAGAR) ?? null

  // Saldos pendientes de liquidar: lo que se acumuló y todavía no se compensó.
  // 2.1.5 es pasivo (saldo acreedor); 1.1.11 es activo (saldo deudor).
  const { saldoDebito, saldoCredito, deudaLiquidada, debitoMes, creditoMes } = useMemo(() => {
    let sDebito = 0, sCredito = 0, sDeuda = 0, dMes = 0, cMes = 0

    for (const entry of entries ?? []) {
      const delMes = entry.date?.startsWith(prefijoMes)
      for (const l of entry.lines ?? []) {
        const debit = Number(l.debit), credit = Number(l.credit)
        if (cuentaDebito && l.account_id === cuentaDebito.id) {
          sDebito += credit - debit
          if (delMes) dMes += credit
        } else if (cuentaCredito && l.account_id === cuentaCredito.id) {
          sCredito += debit - credit
          if (delMes) cMes += debit
        } else if (cuentaAPagar && l.account_id === cuentaAPagar.id) {
          sDeuda += credit - debit
        }
      }
    }
    return {
      saldoDebito: r2(sDebito), saldoCredito: r2(sCredito),
      deudaLiquidada: r2(sDeuda), debitoMes: r2(dMes), creditoMes: r2(cMes),
    }
  }, [entries, cuentaDebito, cuentaCredito, cuentaAPagar, prefijoMes])

  const posicion  = r2(saldoDebito - saldoCredito)
  const aPagar    = posicion > 0
  const hayAlgoQueLiquidar = saldoDebito > 0.005 || saldoCredito > 0.005

  const [liquidando, setLiquidando] = useState(false)
  const [error, setError]           = useState('')

  const [pagoOpen, setPagoOpen]   = useState(false)
  const [pDate, setPDate]         = useState(hoyISO)
  const [pAmount, setPAmount]     = useState('')
  const [pAccountId, setPAccount] = useState(cashAccounts[0]?.id ?? '')
  const [pSaving, setPSaving]     = useState(false)
  const [pError, setPError]       = useState('')

  /** Devuelve la cuenta 2.1.12, creándola si la empresa todavía no la tiene. */
  async function obtenerCuentaAPagar(): Promise<string> {
    if (cuentaAPagar) return cuentaAPagar.id
    const { data, error: err } = await (supabase as any)
      .from('chart_of_accounts')
      .insert({
        company_id: companyId,
        code: COD_IVA_A_PAGAR,
        name: 'IVA a Pagar',
        type: 'pasivo',
        is_active: true,
      })
      .select('id')
      .single()
    if (err) throw new Error(`No se pudo crear la cuenta ${COD_IVA_A_PAGAR} IVA a Pagar: ${err.message}`)
    return data.id as string
  }

  async function liquidar() {
    if (!cuentaDebito || !cuentaCredito) {
      setError('Faltan las cuentas de IVA (2.1.5 y 1.1.11) en el plan de cuentas.')
      return
    }
    setLiquidando(true)
    setError('')

    try {
      const lines: { accountId: string; debit: number; credit: number; description?: string }[] = []

      // Se cancela todo el débito acumulado contra el crédito.
      lines.push({
        accountId: cuentaDebito.id, debit: saldoDebito, credit: 0,
        description: 'Cancelación del IVA Débito del período',
      })

      if (aPagar) {
        // Débito > Crédito: el crédito se consume entero y la diferencia es deuda.
        lines.push({
          accountId: cuentaCredito.id, debit: 0, credit: saldoCredito,
          description: 'Cómputo del IVA Crédito del período',
        })
        lines.push({
          accountId: await obtenerCuentaAPagar(), debit: 0, credit: posicion,
          description: 'Saldo de IVA a ingresar a ARCA',
        })
      } else {
        // Crédito >= Débito: sólo se compensa hasta el débito.
        // El remanente queda en 1.1.11 como saldo técnico a favor del período siguiente.
        lines.push({
          accountId: cuentaCredito.id, debit: 0, credit: saldoDebito,
          description: 'Cómputo parcial del IVA Crédito — el resto queda a favor',
        })
      }

      const { error: entryError } = await createManualJournalEntry({
        companyId,
        createdBy: userId,
        date: hoyISO,
        description: `Liquidación de IVA — ${periodo}`,
        lines,
      })
      if (entryError) throw new Error(entryError)

      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al liquidar el IVA')
    } finally {
      setLiquidando(false)
    }
  }

  function abrirPago() {
    setPDate(hoyISO)
    setPAmount(deudaLiquidada.toFixed(2))
    setPAccount(cashAccounts[0]?.id ?? '')
    setPError('')
    setPagoOpen(true)
  }

  async function registrarPago() {
    const monto = parseFloat(pAmount)
    if (!monto || monto <= 0) { setPError('Ingresá un monto válido.'); return }
    if (!pAccountId)          { setPError('Elegí de qué cuenta sale el pago.'); return }
    if (!cuentaAPagar)        { setPError('Todavía no hay una liquidación registrada.'); return }
    if (monto > deudaLiquidada + 0.005) {
      setPError(`El monto supera la deuda liquidada (${formatCurrency(deudaLiquidada)}).`)
      return
    }
    const cuenta = cashAccounts.find(c => c.id === pAccountId)
    if (cuenta && Number(cuenta.balance) < monto) {
      setPError(`Saldo insuficiente en ${cuenta.name}. Disponible: ${formatCurrency(Number(cuenta.balance))}`)
      return
    }

    setPSaving(true)
    const concepto = `Pago de IVA — ${periodo}`

    await supabase.from('cash_movements').insert({
      company_id: companyId, cash_account_id: pAccountId,
      date: pDate, type: 'egreso', amount: monto, concept: concepto,
      reference_type: 'manual', created_by: userId,
    })

    if (cuenta) {
      await supabase.from('cash_accounts')
        .update({ balance: Number(cuenta.balance) - monto })
        .eq('id', pAccountId)
    }

    // Debe 2.1.12 IVA a Pagar / Haber Caja o Banco.
    await createManualTreasuryEntry({
      companyId, date: pDate, amount: monto, type: 'egreso',
      cashAccountType: cuenta?.type ?? 'banco',
      counterpartAccountId: cuentaAPagar.id,
      concept: concepto,
    })

    setPSaving(false)
    setPagoOpen(false)
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                Liquidación del período · {periodo}
              </p>
              <p className="text-xs text-slate-500">
                Calculada sobre los saldos contables reales de las cuentas de IVA, no sobre estimaciones.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <Button onClick={liquidar} loading={liquidando} disabled={!hayAlgoQueLiquidar}>
                  Liquidar período
                </Button>
                <Button variant="secondary" onClick={abrirPago} disabled={deudaLiquidada <= 0.005 || cashAccounts.length === 0}>
                  Registrar pago
                </Button>
              </div>
              {!hayAlgoQueLiquidar && (
                <span className="text-[11px] text-green-600">No hay IVA pendiente de liquidar</span>
              )}
              {deudaLiquidada > 0.005 && cashAccounts.length === 0 && (
                <span className="text-[11px] text-amber-600">Creá una caja o banco en Tesorería</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">IVA Débito pendiente</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(saldoDebito)}</p>
              <p className="text-[11px] text-slate-400">Del mes: {formatCurrency(debitoMes)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">IVA Crédito pendiente</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(saldoCredito)}</p>
              <p className="text-[11px] text-slate-400">Del mes: {formatCurrency(creditoMes)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Posición</p>
              <p className={`text-lg font-bold ${aPagar ? 'text-red-600' : 'text-green-600'}`}>
                {aPagar
                  ? `A pagar ${formatCurrency(posicion)}`
                  : `A favor ${formatCurrency(Math.abs(posicion))}`}
              </p>
              <p className="text-[11px] text-slate-400">Débito − Crédito</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Deuda ya liquidada</p>
              <p className={`text-lg font-bold ${deudaLiquidada > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                {formatCurrency(deudaLiquidada)}
              </p>
              <p className="text-[11px] text-slate-400">Saldo de 2.1.12 IVA a Pagar</p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{error}</p>
          )}

          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-relaxed mt-4">
            <span className="font-semibold text-slate-600">Cómo funciona:</span> el IVA no es un gasto sino una cuenta
            corriente con ARCA. Durante el mes se acumulan el débito de tus ventas (<span className="font-mono">2.1.5</span>)
            y el crédito de tus compras (<span className="font-mono">1.1.11</span>). Al liquidar se compensan entre sí:
            si el débito supera al crédito, la diferencia se pasa a <span className="font-mono">2.1.12</span> IVA a Pagar
            y se ingresa a ARCA; si el crédito es mayor, el excedente queda en <span className="font-mono">1.1.11</span>
            como saldo técnico a favor y se traslada al período siguiente, sin pagar nada.
          </p>
        </CardContent>
      </Card>

      <Modal open={pagoOpen} onClose={() => setPagoOpen(false)} title="Registrar pago de IVA">
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800">
            Deuda liquidada: <strong>{formatCurrency(deudaLiquidada)}</strong>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del pago</label>
            <input type="date" value={pDate} onChange={e => setPDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input type="number" step="0.01" value={pAmount} onChange={e => setPAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pagar desde</label>
            <select value={pAccountId} onChange={e => setPAccount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {cashAccounts.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {formatCurrency(Number(c.balance))}</option>
              ))}
            </select>
          </div>

          {pError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPagoOpen(false)} disabled={pSaving}>Cancelar</Button>
            <Button onClick={registrarPago} loading={pSaving}>Confirmar pago</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
