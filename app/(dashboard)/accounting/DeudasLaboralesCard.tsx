'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createManualJournalEntry, createManualTreasuryEntry } from '@/lib/accounting/entries'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'

const COD_SUELDOS_A_PAGAR = '2.1.6'
const COD_RETENCIONES     = '2.1.18'
const COD_CONTRIBUCIONES  = '2.1.7'

interface LineLike { account_id: string; debit: number; credit: number }
interface EntryLike { lines: LineLike[] }
interface AccountLike { id: string; code: string; name: string; type: string }
interface CashAccount { id: string; name: string; type: 'caja' | 'banco'; balance: number }

interface Props {
  companyId: string
  userId: string
  entries: EntryLike[]
  accounts: AccountLike[]
  cashAccounts: CashAccount[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

type Modo = 'sueldos' | 'f931'

export function DeudasLaboralesCard({ companyId, userId, entries, accounts, cashAccounts }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const hoyISO = new Date().toISOString().slice(0, 10)

  const ctaSueldos  = accounts.find(a => a.code === COD_SUELDOS_A_PAGAR) ?? null
  const ctaRetenc   = accounts.find(a => a.code === COD_RETENCIONES)     ?? null
  const ctaContrib  = accounts.find(a => a.code === COD_CONTRIBUCIONES)  ?? null

  // Saldos acreedores: lo devengado por las liquidaciones y todavía sin pagar.
  const { saldoSueldos, saldoRetenc, saldoContrib } = useMemo(() => {
    let s = 0, r = 0, c = 0
    for (const e of entries ?? []) {
      for (const l of e.lines ?? []) {
        const neto = Number(l.credit) - Number(l.debit)
        if (ctaSueldos && l.account_id === ctaSueldos.id) s += neto
        else if (ctaRetenc && l.account_id === ctaRetenc.id) r += neto
        else if (ctaContrib && l.account_id === ctaContrib.id) c += neto
      }
    }
    return { saldoSueldos: r2(s), saldoRetenc: r2(r), saldoContrib: r2(c) }
  }, [entries, ctaSueldos, ctaRetenc, ctaContrib])

  const totalF931 = r2(saldoRetenc + saldoContrib)
  const hayAlgo   = saldoSueldos > 0.005 || totalF931 > 0.005

  const [modo, setModo]       = useState<Modo>('sueldos')
  const [open, setOpen]       = useState(false)
  const [date, setDate]       = useState(hoyISO)
  const [amount, setAmount]   = useState('')
  const [accountId, setAccId] = useState(cashAccounts[0]?.id ?? '')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const tope = modo === 'sueldos' ? saldoSueldos : totalF931

  function abrir(m: Modo) {
    setModo(m)
    setDate(hoyISO)
    setAmount((m === 'sueldos' ? saldoSueldos : totalF931).toFixed(2))
    setAccId(cashAccounts[0]?.id ?? '')
    setError('')
    setOpen(true)
  }

  async function registrar() {
    const monto = parseFloat(amount)
    const topeActual = modo === 'sueldos' ? saldoSueldos : totalF931

    if (!monto || monto <= 0) { setError('Ingresá un monto válido.'); return }
    if (!accountId)           { setError('Elegí de qué cuenta sale el pago.'); return }
    if (monto > topeActual + 0.005) {
      setError(`El monto supera la deuda registrada (${formatCurrency(topeActual)}).`)
      return
    }
    const cuenta = cashAccounts.find(c => c.id === accountId)
    if (cuenta && Number(cuenta.balance) < monto) {
      setError(`Saldo insuficiente en ${cuenta.name}. Disponible: ${formatCurrency(Number(cuenta.balance))}`)
      return
    }

    setSaving(true)
    setError('')

    try {
      const concepto = modo === 'sueldos'
        ? 'Pago de sueldos al personal'
        : 'Pago F.931 — aportes y contribuciones'

      await supabase.from('cash_movements').insert({
        company_id: companyId, cash_account_id: accountId,
        date, type: 'egreso', amount: monto, concept: concepto,
        reference_type: 'manual', created_by: userId,
      })

      if (cuenta) {
        await supabase.rpc('update_cash_balance', { p_account_id: accountId, p_delta: -(monto) })
      }

      if (modo === 'sueldos') {
        if (!ctaSueldos) throw new Error(`Falta la cuenta ${COD_SUELDOS_A_PAGAR} en el plan.`)
        // Debe 2.1.6 Sueldos a Pagar / Haber Caja o Banco.
        await createManualTreasuryEntry({
          companyId, date, amount: monto, type: 'egreso',
          cashAccountType: cuenta?.type ?? 'banco',
          counterpartAccountId: ctaSueldos.id,
          concept: concepto,
        })
      } else {
        if (!ctaRetenc || !ctaContrib) throw new Error('Faltan las cuentas 2.1.18 y 2.1.7 en el plan.')
        // El F.931 cancela aportes retenidos y contribuciones en un solo pago.
        // En un pago parcial se reparte a prorrata; el resto se calcula por
        // diferencia para que el asiento cierre exacto.
        const parteRetenc  = totalF931 > 0 ? r2(monto * saldoRetenc / totalF931) : 0
        const parteContrib = r2(monto - parteRetenc)

        const cashAcc = accounts.find(a => a.code === (cuenta?.type === 'caja' ? '1.1.1' : '1.1.2'))
        if (!cashAcc) throw new Error('Falta la cuenta de Caja o Banco en el plan.')

        const { error: entryErr } = await createManualJournalEntry({
          companyId, createdBy: userId, date,
          description: concepto,
          lines: [
            { accountId: ctaRetenc.id,  debit: parteRetenc,  credit: 0, description: 'Aportes retenidos al personal' },
            { accountId: ctaContrib.id, debit: parteContrib, credit: 0, description: 'Contribuciones patronales' },
            { accountId: cashAcc.id,    debit: 0, credit: monto,        description: `Pago del F.931 desde ${cuenta?.name ?? 'banco'}` },
          ],
        })
        if (entryErr) throw new Error(entryErr)
      }

      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar el pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">
                Deudas laborales pendientes
              </p>
              <p className="text-xs text-slate-500">
                Lo que quedó devengado por las liquidaciones de Sueldos 360 y todavía no se pagó.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <Button onClick={() => abrir('sueldos')} disabled={saldoSueldos <= 0.005 || cashAccounts.length === 0}>
                  Pagar sueldos
                </Button>
                <Button variant="secondary" onClick={() => abrir('f931')} disabled={totalF931 <= 0.005 || cashAccounts.length === 0}>
                  Pagar F.931
                </Button>
              </div>
              {!hayAlgo && <span className="text-[11px] text-green-600">No hay deudas laborales pendientes</span>}
              {hayAlgo && cashAccounts.length === 0 && (
                <span className="text-[11px] text-amber-600">Creá una caja o banco en Tesorería</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Sueldos a pagar</p>
              <p className={`text-lg font-bold ${saldoSueldos > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                {formatCurrency(saldoSueldos)}
              </p>
              <p className="text-[11px] text-slate-400">Neto que se le debe al personal · {COD_SUELDOS_A_PAGAR}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Aportes retenidos</p>
              <p className={`text-lg font-bold ${saldoRetenc > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                {formatCurrency(saldoRetenc)}
              </p>
              <p className="text-[11px] text-slate-400">Descontados al trabajador · {COD_RETENCIONES}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Contribuciones patronales</p>
              <p className={`text-lg font-bold ${saldoContrib > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                {formatCurrency(saldoContrib)}
              </p>
              <p className="text-[11px] text-slate-400">A cargo del empleador · {COD_CONTRIBUCIONES}</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-relaxed mt-4">
            <span className="font-semibold text-slate-600">Cómo funciona:</span> la liquidación no saca plata de la
            empresa, solo reconoce deudas. Al personal se le paga el neto (<span className="font-mono">{COD_SUELDOS_A_PAGAR}</span>),
            y lo que se le retuvo más las contribuciones del empleador se ingresan juntos a ARCA con el{' '}
            <strong>F.931</strong> (<span className="font-mono">{COD_RETENCIONES}</span> y{' '}
            <span className="font-mono">{COD_CONTRIBUCIONES}</span>). Por eso son dos pagos distintos, a destinatarios
            distintos, y recién al hacerlos bajan las deudas.
          </p>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={modo === 'sueldos' ? 'Registrar pago de sueldos' : 'Registrar pago del F.931'}
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-800">
            {modo === 'sueldos' ? (
              <>Deuda con el personal: <strong>{formatCurrency(saldoSueldos)}</strong></>
            ) : (
              <>
                Deuda con ARCA: <strong>{formatCurrency(totalF931)}</strong>
                <span className="block text-xs mt-0.5">
                  Aportes {formatCurrency(saldoRetenc)} + contribuciones {formatCurrency(saldoContrib)}
                </span>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del pago</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-[11px] text-slate-400 mt-1">
              {modo === 'f931'
                ? 'Si pagás una parte, se reparte a prorrata entre aportes y contribuciones.'
                : 'Podés pagar una parte: la diferencia queda como deuda.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pagar desde</label>
            <select value={accountId} onChange={e => setAccId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {cashAccounts.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {formatCurrency(Number(c.balance))}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={registrar} loading={saving}>Confirmar pago</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
