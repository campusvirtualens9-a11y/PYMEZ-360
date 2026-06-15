'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/utils/cn'
import {
  createManualTreasuryEntry,
  createTransferJournalEntry,
  createInitialBalanceEntry,
} from '@/lib/accounting/entries'

// ─── Types ─────────────────────────────────────────────────────────────────

interface CashAccount {
  id: string; name: string; type: 'caja' | 'banco'; balance: number
  account_number?: string; bank_account_type?: string
}
interface Checkbook {
  id: string; cash_account_id: string; checkbook_type: string
  number_from: number; number_to: number; current_number: number; status: string
}
interface ChequeData {
  beneficiary: string; amount: number; date: string
  accountName: string; checkNumber: number; checkbookType: string
}

const BANK_ACCOUNT_TYPES = [
  { value: 'cuenta_corriente',    label: 'Cuenta Corriente'          },
  { value: 'caja_ahorro_pesos',   label: 'Caja de Ahorro en Pesos'   },
  { value: 'caja_ahorro_dolares', label: 'Caja de Ahorro en Dólares' },
  { value: 'cuenta_sueldo',       label: 'Cuenta Sueldo'             },
  { value: 'cuenta_comitente',    label: 'Cuenta Comitente'          },
]
interface Movement {
  id: string; date: string; concept: string; type: 'ingreso' | 'egreso'
  amount: number; reference_type: string | null; reference_id: string | null
  cash_account_id: string
  account: { name: string; type: string } | null
}
interface ChartAccount {
  id: string; code: string; name: string
  type: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso'
}
interface Props {
  companyId: string; userId: string; initialAccounts: CashAccount[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

const REF_LABELS: Record<string, { label: string; href: string; color: string }> = {
  sale:       { label: 'Venta',   href: '/sales',       color: 'text-green-700 bg-green-50 border-green-200'   },
  purchase:   { label: 'Compra',  href: '/purchases',   color: 'text-blue-700 bg-blue-50 border-blue-200'      },
  collection: { label: 'Cobro',   href: '/collections', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  payment:    { label: 'Pago',    href: '/payments',    color: 'text-red-700 bg-red-50 border-red-200'          },
  transfer:   { label: 'Transf.', href: '/treasury',    color: 'text-purple-700 bg-purple-50 border-purple-200' },
  manual:     { label: 'Manual',  href: '/treasury',    color: 'text-slate-600 bg-slate-50 border-slate-200'    },
}

// Cuentas de contrapartida sugeridas para movimientos manuales
const QUICK_INGRESO = [
  { code: '3.1.1', label: 'Aporte de capital' },
  { code: '2.1.3', label: 'Préstamo bancario' },
  { code: '1.1.3', label: 'Dev. de cliente' },
]
const QUICK_EGRESO = [
  { code: '5.3.1', label: 'Sueldos' },
  { code: '5.3.3', label: 'Alquiler' },
  { code: '5.3.4', label: 'Servicios' },
  { code: '5.3.6', label: 'Honorarios' },
]

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  activo: 'Activos', pasivo: 'Pasivos', patrimonio: 'Patrimonio',
  ingreso: 'Ingresos', egreso: 'Egresos',
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function TreasuryClient({ companyId, userId, initialAccounts }: Props) {
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────────
  const [accounts,  setAccounts]  = useState<CashAccount[]>(initialAccounts)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading,   setLoading]   = useState(true)

  // Filtros
  const [accountFilter, setAccountFilter] = useState('')
  const [typeFilter,    setTypeFilter]    = useState<'all' | 'ingreso' | 'egreso'>('all')
  const [dateFrom,      setDateFrom]      = useState(startOfMonth)
  const [dateTo,        setDateTo]        = useState(today)

  // Plan de cuentas (para contrapartida en movimientos manuales)
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([])

  // Modal movimiento manual
  const [manualOpen,     setManualOpen]     = useState(false)
  const [mType,          setMType]          = useState<'ingreso' | 'egreso'>('ingreso')
  const [mAmount,        setMAmount]        = useState('')
  const [mConcept,       setMConcept]       = useState('')
  const [mAccountId,     setMAccountId]     = useState('')
  const [mDate,          setMDate]          = useState(today)
  const [mCounterpartId, setMCounterpartId] = useState('')
  const [mSaving,        setMSaving]        = useState(false)
  const [mError,         setMError]         = useState('')

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
  const [newAccOpen,    setNewAccOpen]    = useState(false)
  const [naName,        setNaName]        = useState('')
  const [naType,        setNaType]        = useState<'caja' | 'banco'>('banco')
  const [naBalance,     setNaBalance]     = useState('0')
  const [naAccNumber,   setNaAccNumber]   = useState('')
  const [naBankType,    setNaBankType]    = useState('cuenta_corriente')
  const [naSaving,      setNaSaving]      = useState(false)
  const [naError,       setNaError]       = useState('')

  // Modal chequera
  const [checkbookOpen,    setCheckbookOpen]    = useState(false)
  const [cbAccountId,      setCbAccountId]      = useState('')
  const [cbAccountName,    setCbAccountName]    = useState('')
  const [cbType,           setCbType]           = useState<'comun' | 'diferido'>('comun')
  const [cbFrom,           setCbFrom]           = useState('')
  const [cbTo,             setCbTo]             = useState('')
  const [cbSaving,         setCbSaving]         = useState(false)
  const [cbError,          setCbError]          = useState('')
  const [checkbooks,       setCheckbooks]       = useState<Checkbook[]>([])

  // Modal imprimir cheque
  const [chequeOpen,    setChequeOpen]    = useState(false)
  const [chequeData,    setChequeData]    = useState<ChequeData | null>(null)

  // ── Load data ─────────────────────────────────────────────────────────
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
    const { data } = await supabase
      .from('cash_accounts').select('*').eq('company_id', companyId).order('name')
    if (data) setAccounts(data as CashAccount[])
  }, [companyId])

  const loadCheckbooks = useCallback(async () => {
    const { data } = await supabase
      .from('checkbooks').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
    if (data) setCheckbooks(data as Checkbook[])
  }, [companyId])

  const loadChartAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, type')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('code')
    if (data) setChartAccounts(data as ChartAccount[])
  }, [companyId])

  useEffect(() => {
    loadMovements()
    loadChartAccounts()
    loadCheckbooks()
  }, [loadMovements, loadChartAccounts, loadCheckbooks])

  // ── Computed KPIs ────────────────────────────────────────────────────
  const totalIngreso = useMemo(() => movements.filter(m => m.type === 'ingreso').reduce((s, m) => s + Number(m.amount), 0), [movements])
  const totalEgreso  = useMemo(() => movements.filter(m => m.type === 'egreso') .reduce((s, m) => s + Number(m.amount), 0), [movements])
  const neto      = totalIngreso - totalEgreso
  const totalCash = accounts.filter(a => a.type === 'caja') .reduce((s, a) => s + Number(a.balance), 0)
  const totalBank = accounts.filter(a => a.type === 'banco').reduce((s, a) => s + Number(a.balance), 0)

  // ── Manual movement ──────────────────────────────────────────────────
  function openManual() {
    setMType('ingreso'); setMAmount(''); setMConcept(''); setMError('')
    setMAccountId(accounts[0]?.id ?? ''); setMDate(today)
    setMCounterpartId(chartAccounts.find(a => a.code === '3.1.1')?.id ?? '')
    setManualOpen(true)
  }

  async function saveManual() {
    const amt = parseFloat(mAmount)
    if (!mAccountId)      { setMError('Elegí una cuenta.'); return }
    if (!amt || amt <= 0) { setMError('Ingresá un monto válido.'); return }
    if (!mConcept.trim()) { setMError('Ingresá un concepto.'); return }
    if (chartAccounts.length > 0 && !mCounterpartId) {
      setMError('Elegí la cuenta de contrapartida para completar el asiento contable.')
      return
    }

    const cashAcc = accounts.find(a => a.id === mAccountId)
    if (mType === 'egreso' && cashAcc && Number(cashAcc.balance) < amt) {
      setMError(`Saldo insuficiente. Disponible: ${formatCurrency(Number(cashAcc.balance))}`)
      return
    }

    setMSaving(true)

    await supabase.from('cash_movements').insert({
      company_id: companyId, cash_account_id: mAccountId,
      date: mDate, type: mType, amount: amt, concept: mConcept,
      reference_type: 'manual', created_by: userId,
    })

    if (cashAcc) {
      const newBal = mType === 'ingreso' ? Number(cashAcc.balance) + amt : Number(cashAcc.balance) - amt
      await supabase.from('cash_accounts').update({ balance: newBal }).eq('id', mAccountId)
    }

    // Asiento contable: Debe/Haber según el tipo y la contrapartida elegida
    if (mCounterpartId && cashAcc) {
      await createManualTreasuryEntry({
        companyId,
        date: mDate,
        amount: amt,
        type: mType,
        cashAccountType: cashAcc.type,
        counterpartAccountId: mCounterpartId,
        concept: mConcept,
      })
    }

    setManualOpen(false)
    setMSaving(false)
    await Promise.all([loadMovements(), loadAccounts()])
  }

  // ── Nueva cuenta ─────────────────────────────────────────────────────
  function openNewAccount() {
    setNaName(''); setNaType('banco'); setNaBalance('0'); setNaError('')
    setNaAccNumber(''); setNaBankType('cuenta_corriente')
    setNewAccOpen(true)
  }

  function openCheckbook(acc: CashAccount) {
    setCbAccountId(acc.id); setCbAccountName(acc.name)
    setCbType('comun'); setCbFrom(''); setCbTo(''); setCbError('')
    setCheckbookOpen(true)
  }

  async function saveCheckbook() {
    const from = parseInt(cbFrom) || 0
    const to   = parseInt(cbTo)   || 0
    if (!from || !to || from >= to) { setCbError('Ingresá un rango válido (desde < hasta).'); return }
    setCbSaving(true); setCbError('')
    const { error } = await supabase.from('checkbooks').insert({
      company_id: companyId,
      cash_account_id: cbAccountId,
      checkbook_type: cbType,
      number_from: from,
      number_to: to,
      current_number: from,
      status: 'activo',
    })
    if (error) { setCbError('Error al guardar la chequera.'); setCbSaving(false); return }
    setCheckbookOpen(false); setCbSaving(false)
    loadCheckbooks()
  }

  async function nextCheckNumber(checkbookId: string, current: number, to: number) {
    const next = current + 1
    if (next > to) return
    await supabase.from('checkbooks').update({ current_number: next }).eq('id', checkbookId)
    loadCheckbooks()
  }

  async function saveNewAccount() {
    if (!naName.trim()) { setNaError('El nombre es obligatorio.'); return }
    const balance = parseFloat(naBalance) || 0
    if (balance < 0) { setNaError('El saldo inicial no puede ser negativo.'); return }
    setNaSaving(true)

    const { data: acc, error } = await supabase
      .from('cash_accounts')
      .insert({
        company_id: companyId,
        name: naName.trim(),
        type: naType,
        balance,
        ...(naType === 'banco' && {
          account_number:    naAccNumber.trim() || null,
          bank_account_type: naBankType,
        }),
      })
      .select('id')
      .single()

    if (error || !acc) { setNaError('Error al crear la cuenta.'); setNaSaving(false); return }

    if (balance > 0) {
      await supabase.from('cash_movements').insert({
        company_id: companyId, cash_account_id: acc.id,
        date: today, type: 'ingreso', amount: balance,
        concept: `Saldo inicial — ${naName.trim()}`,
        reference_type: 'manual', created_by: userId,
      })
      // Asiento: Debe Caja/Banco / Haber Capital Social
      await createInitialBalanceEntry({
        companyId,
        date: today,
        amount: balance,
        cashAccountType: naType,
        accountName: naName.trim(),
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
    if (!tFrom || !tTo)  { setTError('Elegí las cuentas de origen y destino.'); return }
    if (tFrom === tTo)   { setTError('Las cuentas de origen y destino deben ser distintas.'); return }
    if (!amt || amt <= 0){ setTError('Ingresá un monto válido.'); return }

    const fromAcc = accounts.find(a => a.id === tFrom)
    if (fromAcc && Number(fromAcc.balance) < amt) {
      setTError(`Saldo insuficiente en "${fromAcc.name}". Disponible: ${formatCurrency(Number(fromAcc.balance))}`)
      return
    }

    setTSaving(true)
    const toAcc      = accounts.find(a => a.id === tTo)
    const conceptoBase = tConcept || 'Transferencia entre cuentas'
    const label      = `${conceptoBase} (${fromAcc?.name} → ${toAcc?.name})`

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

    // Asiento contable (solo cuando los tipos difieren: caja ↔ banco)
    if (fromAcc && toAcc && fromAcc.type !== toAcc.type) {
      await createTransferJournalEntry({
        companyId,
        date: tDate,
        amount: amt,
        fromType: fromAcc.type,
        toType: toAcc.type,
        concept: label,
      })
    }

    setTransferOpen(false)
    setTSaving(false)
    await Promise.all([loadMovements(), loadAccounts()])
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-y-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tesorería</h1>
          <p className="text-slate-500 text-sm mt-0.5">Saldos actuales y movimientos de fondos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openNewAccount}>+ Nueva cuenta</Button>
          <Button variant="outline" onClick={openTransfer}>⇄ Transferir</Button>
          <Button onClick={openManual}>+ Movimiento</Button>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es la tesorería?</strong> Controla todo el dinero de la empresa. Cada movimiento genera automáticamente su asiento en el Libro Diario, manteniendo la contabilidad siempre actualizada.
      </div>

      {/* ── Saldos actuales ──────────────────────────────────────────── */}
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

      {/* ── KPIs del período ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Flujo del período filtrado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* ── Filtros ───────────────────────────────────────────────────── */}
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
            <button
              onClick={() => { setDateFrom(startOfMonth); setDateTo(today); setAccountFilter(''); setTypeFilter('all') }}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-2">
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla de movimientos ──────────────────────────────────────── */}
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

      {/* ── Chequeras ──────────────────────────────────────────────────── */}
      {accounts.filter(a => a.type === 'banco').length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Chequeras</h2>
            <button onClick={() => {
              const banco = accounts.find(a => a.type === 'banco')
              if (banco) openCheckbook(banco)
            }} className="text-xs text-blue-600 hover:underline font-medium">
              + Agregar chequera
            </button>
          </div>
          {checkbooks.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              No hay chequeras registradas. Agregá una para tus cuentas corrientes.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {checkbooks.map(cb => {
                const acc = accounts.find(a => a.id === cb.cash_account_id)
                const remaining = cb.number_to - cb.current_number + 1
                const pct = Math.round(((cb.current_number - cb.number_from) / (cb.number_to - cb.number_from + 1)) * 100)
                return (
                  <Card key={cb.id} className={cb.status === 'agotada' ? 'opacity-50' : ''}>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                          {cb.checkbook_type === 'diferido' ? '📅 Diferido' : '✏️ Común'}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          cb.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>{cb.status}</span>
                      </div>
                      <p className="text-xs text-slate-500">{acc?.name ?? '—'}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-800 font-mono">{String(cb.current_number).padStart(8, '0')}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Rango: {String(cb.number_from).padStart(8,'0')} — {String(cb.number_to).padStart(8,'0')}
                      </div>
                      {/* Barra de uso */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${pct > 80 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{remaining} cheques restantes</span>
                        {cb.status === 'activo' && remaining > 0 && (
                          <button onClick={() => {
                            setChequeData({
                              beneficiary: '',
                              amount: 0,
                              date: today,
                              accountName: acc?.name ?? '',
                              checkNumber: cb.current_number,
                              checkbookType: cb.checkbook_type,
                            })
                            setChequeOpen(true)
                          }} className="text-blue-600 hover:underline font-medium">
                            Emitir cheque →
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

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
            💡 Registrá ajustes de caja, retiros personales o depósitos que no provienen de una operación comercial. Elegí la contrapartida contable y el asiento se genera automáticamente.
          </div>

          {/* Ingreso / Egreso */}
          <div className="flex gap-2">
            {(['ingreso', 'egreso'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => {
                  setMType(t)
                  const defaultCode = t === 'ingreso' ? '3.1.1' : '5.3.3'
                  setMCounterpartId(chartAccounts.find(a => a.code === defaultCode)?.id ?? '')
                }}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  mType === t
                    ? t === 'ingreso' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
              </button>
            ))}
          </div>

          {/* Cuenta de tesorería */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta</label>
            <select value={mAccountId} onChange={e => setMAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</option>
              ))}
            </select>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Concepto</label>
            <input type="text" value={mConcept} onChange={e => setMConcept(e.target.value)}
              placeholder="Ej: Retiro personal del socio, Ajuste de caja..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Monto + Fecha */}
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

          {/* ── Contrapartida contable ────────────────────────────────── */}
          {chartAccounts.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-700">Contrapartida contable</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mType === 'ingreso'
                    ? '¿De dónde proviene el dinero? Esta cuenta se acreditará (Haber).'
                    : '¿A qué se destina el dinero? Esta cuenta se debitará (Debe).'}
                </p>
              </div>

              {/* Sugerencias rápidas */}
              <div className="flex flex-wrap gap-1.5">
                {(mType === 'ingreso' ? QUICK_INGRESO : QUICK_EGRESO).map(q => {
                  const ca = chartAccounts.find(a => a.code === q.code)
                  if (!ca) return null
                  return (
                    <button key={q.code} type="button" onClick={() => setMCounterpartId(ca.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        mCounterpartId === ca.id
                          ? 'border-blue-500 bg-blue-100 text-blue-700 font-medium'
                          : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-100'
                      }`}>
                      {q.label}
                    </button>
                  )
                })}
              </div>

              {/* Dropdown completo agrupado por tipo */}
              <select value={mCounterpartId} onChange={e => setMCounterpartId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                <option value="">— Buscar otra cuenta —</option>
                {(['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'] as const).map(type => {
                  const filtered = chartAccounts.filter(a => a.type === type)
                  if (filtered.length === 0) return null
                  return (
                    <optgroup key={type} label={ACCOUNT_TYPE_LABEL[type]}>
                      {filtered.map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>

              {/* Vista previa del asiento */}
              {mCounterpartId && mAmount && parseFloat(mAmount) > 0 && (() => {
                const counterpart = chartAccounts.find(a => a.id === mCounterpartId)
                const cashAcc = accounts.find(a => a.id === mAccountId)
                const cashLabel = cashAcc
                  ? `${cashAcc.type === 'banco' ? 'Banco' : 'Caja'} (${cashAcc.name})`
                  : 'Caja/Banco'
                const cpLabel = counterpart ? `${counterpart.code} ${counterpart.name}` : '—'
                const amt = parseFloat(mAmount)
                const debeLabel  = mType === 'ingreso' ? cashLabel : cpLabel
                const haberLabel = mType === 'ingreso' ? cpLabel   : cashLabel
                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                    <p className="text-slate-500 font-medium mb-2">Vista previa del asiento:</p>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-700">
                        <span className="font-bold text-green-700">DEBE</span> {debeLabel}
                      </span>
                      <span className="font-bold text-slate-800 ml-4">{formatCurrency(amt)}</span>
                    </div>
                    <div className="flex justify-between items-start mt-1 pl-4">
                      <span className="text-slate-700">
                        <span className="font-bold text-red-700">HABER</span> {haberLabel}
                      </span>
                      <span className="font-bold text-slate-800 ml-4">{formatCurrency(amt)}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

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
            💡 Podés agregar cajas (efectivo físico) o cuentas bancarias. Si ingresás saldo inicial, se registra automáticamente el asiento <strong>Debe {naType === 'banco' ? 'Banco' : 'Caja'} / Haber Capital</strong>.
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
            <input type="text" value={naName} onChange={e => setNaName(e.target.value)}
              placeholder={naType === 'caja' ? 'Ej: Caja Principal' : 'Ej: Banco Galicia'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Campos adicionales para banco */}
          {naType === 'banco' && (
            <div className="space-y-3 border border-blue-100 rounded-xl p-3 bg-blue-50">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Datos bancarios</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de cuenta</label>
                <select value={naBankType} onChange={e => setNaBankType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                  {BANK_ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de cuenta</label>
                <input type="text" value={naAccNumber} onChange={e => setNaAccNumber(e.target.value)}
                  placeholder="Ej: 0010203040 / 052 — opcional"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {naBankType === 'cuenta_corriente' && (
                <p className="text-xs text-blue-600">
                  💡 Las cuentas corrientes pueden tener chequeras. Podés agregarlas después desde la sección "Chequeras".
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saldo inicial (ARS)</label>
            <input type="number" value={naBalance} min="0" step="0.01"
              onChange={e => setNaBalance(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Si el saldo es mayor a cero se genera el movimiento y el asiento contable correspondiente.
            </p>
          </div>

          {naError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{naError}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setNewAccOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={saveNewAccount} loading={naSaving} className="flex-1">Crear cuenta</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL NUEVA CHEQUERA ═══════════════════════════════════════ */}
      <Modal open={checkbookOpen} onClose={() => setCheckbookOpen(false)} title={`Nueva chequera — ${cbAccountName}`}>
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg text-xs text-blue-700">
            💡 Una chequera es un talonario de cheques emitidos sobre la cuenta corriente. Registrá el rango de numeración para llevar el control de cheques emitidos.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de cheque</label>
            <div className="flex gap-2">
              {(['comun', 'diferido'] as const).map(t => (
                <button key={t} type="button" onClick={() => setCbType(t)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    cbType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {t === 'comun' ? '✏️ Común' : '📅 Diferido'}
                  <p className="text-xs font-normal mt-0.5 opacity-70">
                    {t === 'comun' ? 'Cobro inmediato' : 'Cobro a fecha futura'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cuenta bancaria</label>
            <select value={cbAccountId} onChange={e => { const a = accounts.find(x => x.id === e.target.value); setCbAccountId(e.target.value); if(a) setCbAccountName(a.name) }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
              {accounts.filter(a => a.type === 'banco').map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nro. desde</label>
              <input type="number" value={cbFrom} min="1" onChange={e => setCbFrom(e.target.value)}
                placeholder="00000001"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nro. hasta</label>
              <input type="number" value={cbTo} min="1" onChange={e => setCbTo(e.target.value)}
                placeholder="00000025"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {cbFrom && cbTo && parseInt(cbFrom) < parseInt(cbTo) && (
            <p className="text-xs text-slate-500">
              Chequera de {parseInt(cbTo) - parseInt(cbFrom) + 1} cheques
              ({String(parseInt(cbFrom)).padStart(8,'0')} al {String(parseInt(cbTo)).padStart(8,'0')})
            </p>
          )}

          {cbError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{cbError}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setCheckbookOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={saveCheckbook} loading={cbSaving} className="flex-1">Registrar chequera</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL EMITIR CHEQUE ════════════════════════════════════════ */}
      <Modal open={chequeOpen} onClose={() => setChequeOpen(false)} title="Emitir cheque">
        {chequeData && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beneficiario</label>
                <input type="text" value={chequeData.beneficiary} placeholder="Nombre del beneficiario"
                  onChange={e => setChequeData({ ...chequeData, beneficiary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Importe</label>
                <input type="number" value={chequeData.amount || ''} min="0" step="0.01"
                  onChange={e => setChequeData({ ...chequeData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {chequeData.checkbookType === 'diferido' ? 'Fecha de cobro (diferido)' : 'Fecha de emisión'}
              </label>
              <input type="date" value={chequeData.date}
                onChange={e => setChequeData({ ...chequeData, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Vista previa del cheque */}
            {chequeData.beneficiary && chequeData.amount > 0 && (
              <div id="cheque-print" className="border-2 border-slate-700 rounded-xl p-4 bg-white space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Cheque {chequeData.checkbookType === 'diferido' ? 'de Pago Diferido' : 'Común'}</p>
                    <p className="font-bold text-slate-800">{chequeData.accountName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Nro.</p>
                    <p className="font-bold font-mono text-slate-800">{String(chequeData.checkNumber).padStart(8,'0')}</p>
                  </div>
                </div>
                <div className="border-t border-b border-slate-200 py-2 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24 flex-shrink-0">Páguese a:</span>
                    <span className="font-semibold text-slate-800">{chequeData.beneficiary}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24 flex-shrink-0">La suma de:</span>
                    <span className="font-semibold text-slate-800 font-mono">{formatCurrency(chequeData.amount)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24 flex-shrink-0">
                      {chequeData.checkbookType === 'diferido' ? 'Cobrar el:' : 'Fecha:'}
                    </span>
                    <span className="font-semibold text-slate-800">{chequeData.date}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 text-center">Documento educativo — no válido legalmente — EduERP 360</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setChequeOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={() => window.print()} className="flex-1" disabled={!chequeData.beneficiary || !chequeData.amount}>
                🖨️ Imprimir cheque
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ MODAL TRANSFERENCIA ════════════════════════════════════════ */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferencia entre cuentas">
        <div className="p-5 space-y-4">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded-r-lg text-xs text-purple-700">
            💡 Mové dinero entre cuentas. Si el origen y destino son de tipos distintos (caja ↔ banco), el asiento contable se genera automáticamente.
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

          {tFrom && tTo && (() => {
            const fromA = accounts.find(a => a.id === tFrom)
            const toA   = accounts.find(a => a.id === tTo)
            const sameType = fromA?.type === toA?.type
            return (
              <div className={`text-xs px-3 py-2 rounded-lg space-y-0.5 ${sameType ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-2 font-medium">
                  <span>{fromA?.name}</span>
                  <span className="text-purple-500 font-bold">→</span>
                  <span>{toA?.name}</span>
                </div>
                {sameType
                  ? <p>⚠️ Mismos tipos de cuenta — no genera asiento contable (sin impacto neto en el balance).</p>
                  : <p>✓ Tipos distintos — se generará el asiento Debe {toA?.type === 'banco' ? 'Banco' : 'Caja'} / Haber {fromA?.type === 'banco' ? 'Banco' : 'Caja'}.</p>
                }
              </div>
            )
          })()}

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
