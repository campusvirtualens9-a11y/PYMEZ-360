'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/utils/cn'

// ─── Types ─────────────────────────────────────────────────────────────────

interface CashAccount {
  id: string; name: string; type: 'caja' | 'banco'; balance: number
}
interface Movement {
  id: string; date: string; concept: string; type: 'ingreso' | 'egreso'
  amount: number; reference_type: string | null; reference_id: string | null
  cash_account_id: string
  account: { name: string; type: string } | null
}
interface Props {
  companyId: string; userId: string; initialAccounts: CashAccount[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

const REF_LABELS: Record<string, { label: string; href: string; color: string }> = {
  sale:       { label: 'Venta',   href: '/sales',       color: 'text-green-700 bg-green-50 border-green-200'  },
  purchase:   { label: 'Compra',  href: '/purchases',   color: 'text-blue-700 bg-blue-50 border-blue-200'     },
  collection: { label: 'Cobro',   href: '/collections', color: 'text-orange-700 bg-orange-50 border-orange-200'},
  payment:    { label: 'Pago',    href: '/payments',    color: 'text-red-700 bg-red-50 border-red-200'        },
  transfer:   { label: 'Transf.', href: '/treasury',    color: 'text-purple-700 bg-purple-50 border-purple-200'},
  manual:     { label: 'Manual',  href: '/treasury',    color: 'text-slate-600 bg-slate-50 border-slate-200'  },
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function TreasuryClient({ companyId, userId, initialAccounts }: Props) {
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────────
  const [accounts,   setAccounts]   = useState<CashAccount[]>(initialAccounts)
  const [movements,  setMovements]  = useState<Movement[]>([])
  const [loading,    setLoading]    = useState(true)

  // Filtros
  const [accountFilter, setAccountFilter] = useState('')
  const [typeFilter,    setTypeFilter]    = useState<'all' | 'ingreso' | 'egreso'>('all')
  const [dateFrom,      setDateFrom]      = useState(startOfMonth)
  const [dateTo,        setDateTo]        = useState(today)

  // Modal movimiento manual
  const [manualOpen,  setManualOpen]  = useState(false)
  const [mType,       setMType]       = useState<'ingreso' | 'egreso'>('ingreso')
  const [mAmount,     setMAmount]     = useState('')
  const [mConcept,    setMConcept]    = useState('')
  const [mAccountId,  setMAccountId]  = useState('')
  const [mDate,       setMDate]       = useState(today)
  const [mSaving,     setMSaving]     = useState(false)
  const [mError,      setMError]      = useState('')

  // Modal transferencia entre cuentas
  const [transferOpen, setTransferOpen] = useState(false)
  const [tFrom,        setTFrom]        = useState('')
  const [tTo,          setTTo]          = useState('')
  const [tAmount,      setTAmount]      = useState('')
  const [tConcept,     setTConcept]     = useState('Transferencia entre cuentas')
  const [tDate,        setTDate]        = useState(today)
  const [tSaving,      setTSaving]      = useState(false)
  const [tError,       setTError]       = useState('')

  // Modal nueva cuenta
  const [newAccOpen,  setNewAccOpen]  = useState(false)
  const [naName,      setNaName]      = useState('')
  const [naType,      setNaType]      = useState<'caja' | 'banco'>('banco')
  const [naBalance,   setNaBalance]   = useState('0')
  const [naSaving,    setNaSaving]    = useState(false)
  const [naError,     setNaError]     = useState('')

  // ── Load movements ───────────────────────────────────────────────────
  const loadMovements = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('cash_movements')
      .select('*, account:cash_accounts(name, type)')
      .eq('company_id', companyId)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (accountFilter) q = (q as any).eq('cash_account_id', accountFilter)
    if (typeFilter !== 'all') q = (q as any).eq('type', typeFilter)

    const { data } = await q
    setMovements((data ?? []) as Movement[])
    setLoading(false)
  }, [companyId, accountFilter, typeFilter, dateFrom, dateTo])

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase.from('cash_accounts').select('*').eq('company_id', companyId).order('name')
    if (data) setAccounts(data as CashAccount[])
  }, [companyId])

  useEffect(() => {
    loadMovements()
  }, [loadMovements])

  // ── Computed KPIs ────────────────────────────────────────────────────
  const totalIngreso = useMemo(() => movements.filter(m => m.type === 'ingreso').reduce((s, m) => s + Number(m.amount), 0), [movements])
  const totalEgreso  = useMemo(() => movements.filter(m => m.type === 'egreso') .reduce((s, m) => s + Number(m.amount), 0), [movements])
  const neto         = totalIngreso - totalEgreso
  const totalCash    = accounts.filter(a => a.type === 'caja').reduce((s, a) => s + Number(a.balance), 0)
  const totalBank    = accounts.filter(a => a.type === 'banco').reduce((s, a) => s + Number(a.balance), 0)

  // ── Manual movement ──────────────────────────────────────────────────
  function openManual() {
    setMType('ingreso'); setMAmount(''); setMConcept(''); setMError('')
    setMAccountId(accounts[0]?.id ?? ''); setMDate(today)
    setManualOpen(true)
  }

  async function saveManual() {
    const amt = parseFloat(mAmount)
    if (!mAccountId) { setMError('Elegí una cuenta.'); return }
    if (!amt || amt <= 0) { setMError('Ingresá un monto válido.'); return }
    if (!mConcept.trim()) { setMError('Ingresá un concepto.'); return }

    if (mType === 'egreso') {
      const acc = accounts.find(a => a.id === mAccountId)
      if (acc && Number(acc.balance) < amt) {
        setMError(`Saldo insuficiente. Disponible: ${formatCurrency(Number(acc.balance))}`)
        return
      }
    }

    setMSaving(true)
    await supabase.from('cash_movements').insert({
      company_id: companyId, cash_account_id: mAccountId,
      date: mDate, type: mType, amount: amt, concept: mConcept,
      reference_type: 'manual', created_by: userId,
    })

    const acc = accounts.find(a => a.id === mAccountId)
    if (acc) {
      const newBal = mType === 'ingreso' ? Number(acc.balance) + amt : Number(acc.balance) - amt
      await supabase.from('cash_accounts').update({ balance: newBal }).eq('id', mAccountId)
    }

    setManualOpen(false)
    setMSaving(false)
    await Promise.all([loadMovements(), loadAccounts()])
  }

  // ── Nueva cuenta ────────────────────────────────────────────────────
  function openNewAccount() {
    setNaName(''); setNaType('banco'); setNaBalance('0'); setNaError('')
    setNewAccOpen(true)
  }

  async function saveNewAccount() {
    if (!naName.trim()) { setNaError('El nombre es obligatorio.'); return }
    const balance = parseFloat(naBalance) || 0
    if (balance < 0) { setNaError('El saldo inicial no puede ser negativo.'); return }
    setNaSaving(true)

    const { data: acc, error } = await supabase
      .from('cash_accounts')
      .insert({ company_id: companyId, name: naName.trim(), type: naType, balance })
      .select('id')
      .single()

    if (error || !acc) { setNaError('Error al crear la cuenta. Intentá de nuevo.'); setNaSaving(false); return }

    // Registrar saldo inicial como movimiento de ingreso
    if (balance > 0) {
      await supabase.from('cash_movements').insert({
        company_id: companyId, cash_account_id: acc.id,
        date: today, type: 'ingreso', amount: balance,
        concept: `Saldo inicial — ${naName.trim()}`,
        reference_type: 'manual', created_by: userId,
      })
    }

    setNewAccOpen(false); setNaSaving(false)
    await Promise.all([loadMovements(), loadAccounts()])
  }

  // ── Transfer ─────────────────────────────────────────────────────────
  function openTransfer() {
    const caja  = accounts.find(a => a.type === 'caja')
    const banco = accounts.find(a => a.type === 'banco')
    setTFrom(caja?.id ?? accounts[0]?.id ?? '')
    setTTo(banco?.id ?? accounts[1]?.id ?? '')
    setTAmount(''); setTConcept('Transferencia entre cuentas'); setTError('')
    setTDate(today); setTransferOpen(true)
  }

  async function saveTransfer() {
    const amt = parseFloat(tAmount)
    if (!tFrom || !tTo) { setTError('Elegí las cuentas de origen y destino.'); return }
    if (tFrom === tTo) { setTError('Las cuentas de origen y destino deben ser distintas.'); return }
    if (!amt || amt <= 0) { setTError('Ingresá un monto válido.'); return }

    const fromAcc = accounts.find(a => a.id === tFrom)
    if (fromAcc && Number(fromAcc.balance) < amt) {
      setTError(`Saldo insuficiente en "${fromAcc.name}". Disponible: ${formatCurrency(Number(fromAcc.balance))}`)
      return
    }

    setTSaving(true)
    const toAcc = accounts.find(a => a.id === tTo)
    const conceptoBase = tConcept || 'Transferencia entre cuentas'
    const label = `${conceptoBase} (${fromAcc?.name} → ${toAcc?.name})`

    // Egreso desde origen
    await supabase.from('cash_movements').insert({
      company_id: companyId, cash_account_id: tFrom,
      date: tDate, type: 'egreso', amount: amt, concept: label,
      reference_type: 'transfer', created_by: userId,
    })
    if (fromAcc) {
      await supabase.from('cash_accounts').update({ balance: Number(fromAcc.balance) - amt }).eq('id', tFrom)
    }

    // Ingreso en destino
    await supabase.from('cash_movements').insert({
      company_id: companyId, cash_account_id: tTo,
      date: tDate, type: 'ingreso', amount: amt, concept: label,
      reference_type: 'transfer', created_by: userId,
    })
    if (toAcc) {
      await supabase.from('cash_accounts').update({ balance: Number(toAcc.balance) + amt }).eq('id', tTo)
    }

    setTransferOpen(false)
    setTSaving(false)
    await Promise.all([loadMovements(), loadAccounts()])
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tesorería</h1>
          <p className="text-slate-500 text-sm mt-0.5">Saldos actuales y movimientos de fondos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewAccount}>+ Nueva cuenta</Button>
          <Button variant="outline" onClick={openTransfer}>⇄ Transferir</Button>
          <Button onClick={openManual}>+ Movimiento manual</Button>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es la tesorería?</strong> Controla todo el dinero de la empresa: cuánto hay en caja y banco, qué entró y qué salió. Los movimientos se generan automáticamente con cada operación; también podés registrar ajustes manuales o transferencias entre cuentas.
      </div>

      {/* ── Saldos actuales ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Saldos actuales</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {accounts.map(a => (
            <Card key={a.id} className={Number(a.balance) < 0 ? 'border-red-200 bg-red-50' : ''}>
              <CardContent>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500 truncate">{a.name}</span>
                  <Badge variant={a.type === 'caja' ? 'info' : 'default'} className="ml-1 shrink-0">{a.type}</Badge>
                </div>
                <p className={`text-xl font-bold ${Number(a.balance) < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatCurrency(Number(a.balance))}
                </p>
                {Number(a.balance) < 0 && (
                  <p className="text-xs text-red-500 mt-0.5">⚠️ Saldo negativo</p>
                )}
              </CardContent>
            </Card>
          ))}
          {/* Totales */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent>
              <p className="text-xs font-medium text-slate-500 mb-1">Total caja</p>
              <p className="text-xl font-bold text-slate-700">{formatCurrency(totalCash)}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent>
              <p className="text-xs font-medium text-blue-600 mb-1">Total banco</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(totalBank)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200 md:col-span-2">
            <CardContent>
              <p className="text-xs font-medium text-green-600 mb-1">Total disponible</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCash + totalBank)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── KPIs del período ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Flujo del período filtrado</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Ingresado</p>
              <p className="text-xl font-bold text-green-600">+{formatCurrency(totalIngreso)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{movements.filter(m => m.type === 'ingreso').length} mov.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Egresado</p>
              <p className="text-xl font-bold text-red-600">-{formatCurrency(totalEgreso)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{movements.filter(m => m.type === 'egreso').length} mov.</p>
            </CardContent>
          </Card>
          <Card className={neto >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <CardContent>
              <p className={`text-xs uppercase tracking-wide mb-1 ${neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>Resultado neto</p>
              <p className={`text-xl font-bold ${neto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {neto >= 0 ? '+' : ''}{formatCurrency(neto)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{movements.length} movimientos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Movimientos</h2>
        <div className="flex flex-wrap gap-3 items-end bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Cuenta</label>
            <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las cuentas</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Tipo</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-300">
              {(['all', 'ingreso', 'egreso'] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    typeFilter === t
                      ? t === 'ingreso' ? 'bg-green-600 text-white' : t === 'egreso' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
                  {t === 'all' ? 'Todos' : t === 'ingreso' ? '↑ Ingresos' : '↓ Egresos'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => { setDateFrom(startOfMonth); setDateTo(today); setAccountFilter(''); setTypeFilter('all') }}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-2">
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla de movimientos ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando movimientos...</div>
          ) : movements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Sin movimientos para el período y filtros seleccionados.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Concepto</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Cuenta</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Origen</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Importe</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const ref = m.reference_type ? REF_LABELS[m.reference_type] : null
                  return (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{formatDate(m.date)}</td>
                      <td className="px-5 py-3 text-slate-800 max-w-[220px]">
                        <span className="truncate block">{m.concept}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {m.account?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {ref ? (
                          <Link href={ref.href}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors hover:opacity-80 ${ref.color}`}>
                            {ref.label}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={m.type === 'ingreso' ? 'success' : 'danger'}>{m.type}</Badge>
                      </td>
                      <td className={`px-5 py-3 text-right font-bold ${m.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'ingreso' ? '+' : '−'} {formatCurrency(Number(m.amount))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-slate-700 text-sm">Resultado del período</td>
                  <td className={`px-5 py-3 text-right text-sm ${neto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {neto >= 0 ? '+' : '−'} {formatCurrency(Math.abs(neto))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Links a módulos relacionados */}
      <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
        <span>Ver también:</span>
        <Link href="/collections" className="text-orange-500 hover:underline">→ Cobros pendientes</Link>
        <Link href="/payments"    className="text-red-500 hover:underline">→ Pagos pendientes</Link>
        <Link href="/accounting"  className="text-blue-500 hover:underline">→ Libro diario</Link>
      </div>

      {/* ═══ MODAL MOVIMIENTO MANUAL ════════════════════════════════════ */}
      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Registrar movimiento manual">
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-xs text-amber-700">
            💡 Usá esto para registrar ajustes de caja, retiros personales, depósitos iniciales u otros movimientos que no provienen de una operación comercial.
          </div>

          <div className="flex gap-2">
            {(['ingreso', 'egreso'] as const).map(t => (
              <button key={t} onClick={() => setMType(t)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  mType === t
                    ? t === 'ingreso' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta</label>
            <select value={mAccountId} onChange={e => setMAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Concepto</label>
            <input type="text" value={mConcept} onChange={e => setMConcept(e.target.value)}
              placeholder="Ej: Retiro personal del socio, Ajuste de caja..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
              <input type="number" value={mAmount} min="0.01" step="0.01"
                onChange={e => setMAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" value={mDate} onChange={e => setMDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {mError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{mError}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setManualOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={saveManual} loading={mSaving} className="flex-1">Guardar movimiento</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL NUEVA CUENTA ═════════════════════════════════════════ */}
      <Modal open={newAccOpen} onClose={() => setNewAccOpen(false)} title="Nueva cuenta de tesorería">
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg text-xs text-blue-700">
            💡 Podés agregar cajas (efectivo físico) o cuentas bancarias. Cada una tiene su propio saldo y movimientos independientes.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de cuenta</label>
            <div className="flex gap-2">
              {(['caja', 'banco'] as const).map(t => (
                <button key={t} onClick={() => setNaType(t)}
                  className={`flex-1 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    naType === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  {t === 'caja' ? '💵 Caja' : '🏛️ Banco'}
                  <p className="text-xs font-normal mt-0.5 opacity-70">
                    {t === 'caja' ? 'Efectivo físico' : 'Cuenta bancaria'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text" value={naName} onChange={e => setNaName(e.target.value)}
              placeholder={naType === 'caja' ? 'Ej: Caja Sucursal Norte' : 'Ej: Banco Galicia CC 123456'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saldo inicial (ARS)</label>
            <input
              type="number" value={naBalance} min="0" step="0.01"
              onChange={e => setNaBalance(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Si ingresás un saldo inicial mayor a cero, se registrará automáticamente como ingreso "Saldo inicial".
            </p>
          </div>

          {naError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{naError}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setNewAccOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={saveNewAccount} loading={naSaving} className="flex-1">Crear cuenta</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL TRANSFERENCIA ════════════════════════════════════════ */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferencia entre cuentas">
        <div className="p-5 space-y-4">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded-r-lg text-xs text-purple-700">
            💡 Registra el dinero que movés de una cuenta a otra (ej: de caja a banco, o vice versa). Se generan dos movimientos que se compensan.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Desde (origen)</label>
              <select value={tFrom} onChange={e => setTFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                <option value="">— Elegir —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hacia (destino)</label>
              <select value={tTo} onChange={e => setTTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                <option value="">— Elegir —</option>
                {accounts.filter(a => a.id !== tFrom).map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>
                ))}
              </select>
            </div>
          </div>

          {tFrom && tTo && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
              <span className="font-medium">{accounts.find(a => a.id === tFrom)?.name}</span>
              <span className="text-purple-500 font-bold">→</span>
              <span className="font-medium">{accounts.find(a => a.id === tTo)?.name}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Concepto</label>
            <input type="text" value={tConcept} onChange={e => setTConcept(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto a transferir</label>
              <input type="number" value={tAmount} min="0.01" step="0.01"
                onChange={e => setTAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" value={tDate} onChange={e => setTDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {tFrom && tAmount && (
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg space-y-0.5">
              <p>Saldo actual en origen: <strong>{formatCurrency(Number(accounts.find(a => a.id === tFrom)?.balance ?? 0))}</strong></p>
              <p>Saldo resultante en origen: <strong>{formatCurrency(Number(accounts.find(a => a.id === tFrom)?.balance ?? 0) - (parseFloat(tAmount) || 0))}</strong></p>
            </div>
          )}

          {tError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{tError}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setTransferOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={saveTransfer} loading={tSaving} className="flex-1">Confirmar transferencia</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
