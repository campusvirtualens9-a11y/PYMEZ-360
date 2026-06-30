'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SueldosData {
  company_name: string
  company_cuit: string
  period: string
  employee_count: number
  runs_count: number
  totals: {
    total_bruto: number
    total_neto: number
    total_aportes_trabajador: number
    total_contribuciones_patronales: number
    total_costo_laboral: number
  }
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function findAccount(accounts: Account[], type: string, keywords: string[]) {
  return accounts.find(a =>
    a.type === type &&
    keywords.some(kw => a.name.toLowerCase().includes(kw.toLowerCase()))
  ) ?? null
}

interface Props {
  companyId: string
  userId: string
  accounts: Account[]
}

export function SueldosSyncCard({ companyId, userId, accounts }: Props) {
  const [open, setOpen]         = useState(false)
  const [token, setToken]       = useState('')
  const [period, setPeriod]     = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [data, setData]         = useState<SueldosData | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  async function fetchPayroll() {
    if (!token.trim()) return
    setLoading(true); setError(null); setData(null)
    try {
      const res = await fetch(`/api/sueldos-sync?token=${encodeURIComponent(token.trim().toUpperCase())}&period=${period}`)
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error al conectar con Sueldos 360')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false) }
  }

  async function getOrCreate(supabase: ReturnType<typeof createClient>, found: Account | null, payload: { company_id: string; code: string; name: string; type: string }): Promise<Account> {
    if (found) return found
    const { data, error } = await (supabase as any)
      .from('chart_of_accounts')
      .insert({ ...payload, is_active: true })
      .select('id, code, name, type')
      .single()
    if (error) throw new Error(`No se pudo crear la cuenta "${payload.name}": ${error.message}`)
    return data as Account
  }

  async function createEntries() {
    if (!data) return
    setSaving(true); setError(null)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: company } = await (supabase as any)
        .from('companies').select('id').eq('owner_id', user!.id)
        .order('created_at', { ascending: false }).limit(1).single()
      const cId = company?.id ?? companyId

      // Buscar cuentas; crearlas automáticamente si no existen
      const cuentaSueldos = await getOrCreate(supabase,
        findAccount(accounts, 'egreso', ['sueldo', 'remun', 'habere']),
        { company_id: cId, code: '5.1.01', name: 'Sueldos y Jornales', type: 'egreso' })

      const cuentaCargas = await getOrCreate(supabase,
        findAccount(accounts, 'egreso', ['carga', 'patronal', 'social']),
        { company_id: cId, code: '5.1.02', name: 'Cargas Sociales Patronales', type: 'egreso' })

      const cuentaAPagar = await getOrCreate(supabase,
        findAccount(accounts, 'pasivo', ['sueldo a pagar', 'haberes a pagar', 'sueldos a pagar']),
        { company_id: cId, code: '2.1.01', name: 'Sueldos a Pagar', type: 'pasivo' })

      const cuentaRetenc = await getOrCreate(supabase,
        findAccount(accounts, 'pasivo', ['retenc', 'aporte', 'descuento']),
        { company_id: cId, code: '2.1.02', name: 'Retenciones Previsionales a Pagar', type: 'pasivo' })

      const cuentaCargasPasivo = await getOrCreate(supabase,
        findAccount(accounts, 'pasivo', ['patronal', 'contribuc', 'carga social']),
        { company_id: cId, code: '2.1.03', name: 'Contribuciones Patronales a Pagar', type: 'pasivo' })

      const { totals, period: p, company_name, employee_count } = data
      const desc1 = `Liquidación sueldos ${p} — ${company_name} (${employee_count} empleados)`
      const desc2 = `Cargas sociales patronales ${p} — ${company_name}`

      // Asiento 1: Devengamiento sueldos
      const { data: entry1, error: e1 } = await (supabase as any)
        .from('journal_entries')
        .insert({ company_id: companyId, date: `${p}-25`, description: desc1, entry_type: 'automatico', reference_type: 'sueldos360', created_by: userId })
        .select('id').single()
      if (e1) throw new Error(e1.message)

      const lines1: any[] = [
        { journal_entry_id: entry1.id, account_id: cuentaSueldos.id, debit: totals.total_bruto, credit: 0, description: 'Sueldos brutos' },
        { journal_entry_id: entry1.id, account_id: cuentaAPagar.id,  debit: 0, credit: totals.total_neto, description: 'Neto a pagar' },
      ]
      if (totals.total_aportes_trabajador > 0) {
        lines1.push({ journal_entry_id: entry1.id, account_id: cuentaRetenc.id, debit: 0, credit: totals.total_aportes_trabajador, description: 'Retenciones previsionales empleado' })
      }
      await (supabase as any).from('journal_entry_lines').insert(lines1)

      // Asiento 2: Cargas patronales
      if (totals.total_contribuciones_patronales > 0) {
        const { data: entry2, error: e2 } = await (supabase as any)
          .from('journal_entries')
          .insert({ company_id: companyId, date: `${p}-25`, description: desc2, entry_type: 'automatico', reference_type: 'sueldos360', created_by: userId })
          .select('id').single()
        if (e2) throw new Error(e2.message)

        await (supabase as any).from('journal_entry_lines').insert([
          { journal_entry_id: entry2.id, account_id: cuentaCargas.id,       debit: totals.total_contribuciones_patronales, credit: 0, description: 'Cargas patronales' },
          { journal_entry_id: entry2.id, account_id: cuentaCargasPasivo.id, debit: 0, credit: totals.total_contribuciones_patronales, description: 'Contribuciones patronales a pagar' },
        ])
      }

      setSuccess(`Asientos de sueldos ${p} registrados correctamente.`)
      setData(null); setToken(''); setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear asientos')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-4">
        {success && (
          <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-2 text-sm">
            ✓ {success}
          </div>
        )}
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-violet-200 hover:border-violet-400 rounded-xl text-sm text-violet-600 hover:text-violet-700 transition-colors bg-violet-50/50 hover:bg-violet-50"
        >
          <span className="text-xl">👷</span>
          <div className="text-left">
            <p className="font-semibold">Importar liquidación desde Sueldos 360</p>
            <p className="text-xs text-slate-500">Genera asientos de sueldos y cargas patronales automáticamente</p>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 border-2 border-violet-200 bg-violet-50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">👷</span>
          <p className="text-sm font-bold text-violet-800">Importar desde Sueldos 360</p>
        </div>
        <button onClick={() => { setOpen(false); setData(null); setError(null) }}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Código de sincronización</label>
          <input
            value={token}
            onChange={e => setToken(e.target.value.toUpperCase())}
            placeholder="Ej: AB12CD"
            className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
          <p className="text-[10px] text-slate-400 mt-1">Copiá el código desde Sueldos 360 → Empresas</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Período</label>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">{error}</div>
      )}

      {!data && (
        <button
          onClick={fetchPayroll}
          disabled={loading || !token.trim()}
          className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {loading ? 'Consultando Sueldos 360…' : 'Consultar liquidación'}
        </button>
      )}

      {/* Vista previa */}
      {data && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-violet-100 p-4">
            <p className="text-xs font-bold text-violet-700 mb-3">
              {data.company_name} · {data.period} · {data.employee_count} empleados
            </p>

            {/* Asiento 1: Sueldos */}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Asiento 1 — Devengamiento sueldos</p>
            <table className="w-full text-xs mb-3">
              <thead><tr className="text-[10px] text-slate-400">
                <th className="text-left pb-1">Cuenta</th><th className="text-right pb-1">Debe</th><th className="text-right pb-1">Haber</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                <tr><td className="py-1">Sueldos y Jornales (egreso)</td><td className="text-right font-mono">{fmt(data.totals.total_bruto)}</td><td /></tr>
                <tr><td className="py-1 pl-4 text-slate-500">Sueldos a Pagar (pasivo)</td><td /><td className="text-right font-mono">{fmt(data.totals.total_neto)}</td></tr>
                <tr><td className="py-1 pl-4 text-slate-500">Retenciones Previsionales (pasivo)</td><td /><td className="text-right font-mono">{fmt(data.totals.total_aportes_trabajador)}</td></tr>
              </tbody>
            </table>

            {data.totals.total_contribuciones_patronales > 0 && <>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Asiento 2 — Cargas patronales</p>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-50">
                  <tr><td className="py-1">Cargas Sociales Patronales (egreso)</td><td className="text-right font-mono">{fmt(data.totals.total_contribuciones_patronales)}</td><td /></tr>
                  <tr><td className="py-1 pl-4 text-slate-500">Contribuciones Patronales a Pagar (pasivo)</td><td /><td className="text-right font-mono">{fmt(data.totals.total_contribuciones_patronales)}</td></tr>
                </tbody>
              </table>
            </>}

            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-xs font-bold">
              <span className="text-slate-600">Costo laboral total</span>
              <span className="text-slate-800">{fmt(data.totals.total_costo_laboral)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={createEntries}
              disabled={saving}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Registrando…' : '✓ Registrar asientos'}
            </button>
            <button
              onClick={() => setData(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
