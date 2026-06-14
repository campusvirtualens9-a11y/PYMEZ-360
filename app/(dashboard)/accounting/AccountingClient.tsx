'use client'

import { useState, useMemo } from 'react'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/utils/cn'

// ─── Types ─────────────────────────────────────────────────────────────────

interface JournalLine {
  id: string
  account_id: string
  debit: number
  credit: number
  description: string | null
  account: { id: string; code: string; name: string; type: string } | null
}
interface JournalEntry {
  id: string; date: string; description: string; entry_type: string
  lines: JournalLine[]
}
interface Account {
  id: string; code: string; name: string; type: string; is_active: boolean
}
type RelatedEntity = { name: string; cuit: string | null }
interface SaleRow {
  id: string; date: string; total: number; transaction_type: string
  customer: RelatedEntity[] | RelatedEntity | null
}
interface PurchaseRow {
  id: string; date: string; total: number; transaction_type: string
  supplier: RelatedEntity[] | RelatedEntity | null
}
interface Props {
  entries: JournalEntry[]; accounts: Account[]
  sales: SaleRow[]; purchases: PurchaseRow[]
  companyId: string; userId: string; companyName: string; companyCuit: string
}

// ─── Computations ──────────────────────────────────────────────────────────

interface BalanceRow {
  id: string; code: string; name: string; type: string
  sumasDebe: number; sumasHaber: number
  saldoDeudor: number; saldoAcreedor: number
  erPerdidas: number; erGanancias: number
  bgActivo: number; bgPasivo: number
}

function computeTrialBalance(entries: JournalEntry[], accounts: Account[]): BalanceRow[] {
  const totals: Record<string, { debe: number; haber: number }> = {}
  for (const acc of accounts) totals[acc.id] = { debe: 0, haber: 0 }
  for (const e of entries) {
    for (const l of e.lines ?? []) {
      if (totals[l.account_id]) {
        totals[l.account_id].debe  += Number(l.debit)
        totals[l.account_id].haber += Number(l.credit)
      }
    }
  }
  return accounts.map((acc) => {
    const t = totals[acc.id] ?? { debe: 0, haber: 0 }
    const sD = Math.max(0, t.debe - t.haber)
    const sA = Math.max(0, t.haber - t.debe)
    return {
      id: acc.id, code: acc.code, name: acc.name, type: acc.type,
      sumasDebe: t.debe, sumasHaber: t.haber,
      saldoDeudor: sD, saldoAcreedor: sA,
      erPerdidas:  acc.type === 'egreso'  ? sD : 0,
      erGanancias: acc.type === 'ingreso' ? sA : 0,
      bgActivo:    acc.type === 'activo'  ? sD : 0,
      bgPasivo:    (acc.type === 'pasivo' || acc.type === 'patrimonio') ? sA : 0,
    }
  }).filter(r => r.sumasDebe > 0 || r.sumasHaber > 0)
}

interface MayorMovement {
  date: string; entryDesc: string; debe: number; haber: number; saldo: number
}
interface MayorAccount {
  account: Account; movements: MayorMovement[]; totalDebe: number; totalHaber: number; saldoFinal: number
}

function computeLibroMayor(entries: JournalEntry[], accounts: Account[]): MayorAccount[] {
  const byAccount: Record<string, { account: Account; movements: MayorMovement[] }> = {}
  for (const acc of accounts) byAccount[acc.id] = { account: acc, movements: [] }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  for (const e of sorted) {
    for (const l of e.lines ?? []) {
      if (!byAccount[l.account_id]) continue
      byAccount[l.account_id].movements.push({
        date: e.date, entryDesc: e.description,
        debe: Number(l.debit), haber: Number(l.credit), saldo: 0,
      })
    }
  }

  return Object.values(byAccount)
    .filter(({ movements }) => movements.length > 0)
    .map(({ account, movements }) => {
      let running = 0
      const withSaldo = movements.map((m) => {
        running += m.debe - m.haber
        return { ...m, saldo: running }
      })
      const totalDebe  = movements.reduce((s, m) => s + m.debe,  0)
      const totalHaber = movements.reduce((s, m) => s + m.haber, 0)
      return { account, movements: withSaldo, totalDebe, totalHaber, saldoFinal: running }
    })
    .sort((a, b) => a.account.code.localeCompare(b.account.code))
}

interface IVARow {
  date: string; nombre: string; cuit: string; total: number; neto: number; iva: number
}

function unwrap(entity: RelatedEntity[] | RelatedEntity | null | undefined): RelatedEntity | null {
  if (!entity) return null
  return Array.isArray(entity) ? (entity[0] ?? null) : entity
}

function computeLibroIVA(sales: SaleRow[], purchases: PurchaseRow[]): { ventas: IVARow[]; compras: IVARow[] } {
  const toRow = (date: string, nombre: string, cuit: string | null, total: number): IVARow => {
    const neto = total / 1.21
    return { date, nombre, cuit: cuit ?? '—', total, neto, iva: total - neto }
  }
  return {
    ventas:  sales.map(s => { const c = unwrap(s.customer); return toRow(s.date, c?.name ?? 'Consumidor Final', c?.cuit ?? null, Number(s.total)) }),
    compras: purchases.map(p => { const c = unwrap(p.supplier); return toRow(p.date, c?.name ?? '—', c?.cuit ?? null, Number(p.total)) }),
  }
}

// ─── Tab bar ───────────────────────────────────────────────────────────────

type Tab = 'diario' | 'cuentas' | 'mayor' | 'balance12' | 'resultados' | 'iva' | 'ddjj'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'diario',     label: 'Libro Diario',       icon: '📒' },
  { key: 'cuentas',   label: 'Plan de Cuentas',    icon: '📋' },
  { key: 'mayor',     label: 'Libro Mayor',         icon: '📗' },
  { key: 'balance12', label: 'Balance 12 Col.',     icon: '📊' },
  { key: 'resultados',label: 'Estado Resultados',   icon: '📈' },
  { key: 'iva',       label: 'Libro IVA',           icon: '🧾' },
  { key: 'ddjj',      label: 'DDJJ ARCA/AFIP',     icon: '🏛️' },
]

// ─── Main component ────────────────────────────────────────────────────────

export default function AccountingClient({ entries, accounts, sales, purchases, companyId, userId, companyName, companyCuit }: Props) {
  const [activeTab, setActiveTab]           = useState<Tab>('diario')
  const [selectedEntry, setSelectedEntry]   = useState<JournalEntry | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [journalViewed, setJournalViewed]   = useState(false)
  const [ivaSubTab, setIvaSubTab]           = useState<'ventas' | 'compras'>('ventas')

  const trialBalance  = useMemo(() => computeTrialBalance(entries, accounts),  [entries, accounts])
  const libroMayor    = useMemo(() => computeLibroMayor(entries, accounts),    [entries, accounts])
  const libroIVA      = useMemo(() => computeLibroIVA(sales, purchases),       [sales, purchases])

  const erGanancias   = trialBalance.reduce((s, r) => s + r.erGanancias, 0)
  const erPerdidas    = trialBalance.reduce((s, r) => s + r.erPerdidas,  0)
  const resultado     = erGanancias - erPerdidas

  const ivaDebito     = libroIVA.ventas.reduce((s, r) => s + r.iva,   0)
  const ivaCredito    = libroIVA.compras.reduce((s, r) => s + r.iva,  0)
  const saldoTecnico  = ivaDebito - ivaCredito

  async function openEntry(entry: JournalEntry) {
    setSelectedEntry(entry)
    if (!journalViewed) {
      await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'VIEW_JOURNAL' })
      await awardXp({ profileId: userId, companyId, amount: 10, reason: 'Libro diario consultado' })
      setJournalViewed(true)
    }
  }

  const mayorAccount = libroMayor.find(m => m.account.id === selectedAccount)

  // ─── Type badge color ────────────────────────────────────────────────────
  const typeBadge = (t: string) =>
    t === 'activo' ? 'info' : t === 'pasivo' ? 'danger' : t === 'ingreso' ? 'success' : t === 'egreso' ? 'warning' : 'default'

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto pb-0">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-white border border-b-white border-slate-200 text-blue-700 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ LIBRO DIARIO ═══════════════════════════════════════════════════ */}
      {activeTab === 'diario' && (
        <Card>
          <CardHeader>
            <CardTitle>📒 Libro Diario</CardTitle>
            <Badge variant="info">{entries.length} asientos</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Aún no hay asientos. Se generan automáticamente al registrar operaciones, o podés crear uno manual con "+ Nuevo asiento".
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Descripción</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Total Debe</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map((e) => {
                    const totalDebit = (e.lines ?? []).reduce((s, l) => s + Number(l.debit), 0)
                    return (
                      <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => openEntry(e)}>
                        <td className="px-5 py-3 text-slate-600">{formatDate(e.date)}</td>
                        <td className="px-5 py-3 text-slate-800">{e.description}</td>
                        <td className="px-5 py-3">
                          <Badge variant={e.entry_type === 'manual' ? 'warning' : 'info'}>{e.entry_type}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(totalDebit)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs text-right">Ver →</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ PLAN DE CUENTAS ════════════════════════════════════════════════ */}
      {activeTab === 'cuentas' && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Plan de Cuentas</CardTitle>
            <Badge variant="info">{accounts.length} cuentas</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Código</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Cuenta</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-2 font-mono text-xs text-slate-500">{a.code}</td>
                    <td className="px-5 py-2 text-slate-800">{a.name}</td>
                    <td className="px-5 py-2"><Badge variant={typeBadge(a.type) as any}>{a.type}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ═══ LIBRO MAYOR ════════════════════════════════════════════════════ */}
      {activeTab === 'mayor' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Cuenta:</label>
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 min-w-[320px]">
              <option value="">— Seleccionar cuenta —</option>
              {libroMayor.map(m => (
                <option key={m.account.id} value={m.account.id}>
                  {m.account.code} · {m.account.name}
                </option>
              ))}
            </select>
          </div>

          {mayorAccount ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="font-mono text-blue-700 mr-2">{mayorAccount.account.code}</span>
                  {mayorAccount.account.name}
                </CardTitle>
                <Badge variant={typeBadge(mayorAccount.account.type) as any}>{mayorAccount.account.type}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Concepto</th>
                      <th className="text-right px-4 py-3 text-xs text-blue-500 font-medium uppercase tracking-wide">Debe</th>
                      <th className="text-right px-4 py-3 text-xs text-green-500 font-medium uppercase tracking-wide">Haber</th>
                      <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mayorAccount.movements.map((m, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDate(m.date)}</td>
                        <td className="px-4 py-2.5 text-slate-800">{m.entryDesc}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${m.debe > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                          {m.debe > 0 ? formatCurrency(m.debe) : '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-medium ${m.haber > 0 ? 'text-green-700' : 'text-slate-300'}`}>
                          {m.haber > 0 ? formatCurrency(m.haber) : '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-bold ${m.saldo >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(m.saldo))}
                          <span className="text-xs font-normal ml-1">{m.saldo >= 0 ? 'D' : 'A'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-slate-700">Totales</td>
                      <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(mayorAccount.totalDebe)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatCurrency(mayorAccount.totalHaber)}</td>
                      <td className={`px-4 py-3 text-right ${mayorAccount.saldoFinal >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(mayorAccount.saldoFinal))}
                        <span className="text-xs font-normal ml-1">{mayorAccount.saldoFinal >= 0 ? 'Deudor' : 'Acreedor'}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          ) : (
            <div className="py-16 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              Seleccioná una cuenta para ver sus movimientos.
            </div>
          )}
        </div>
      )}

      {/* ═══ BALANCE 12 COLUMNAS ════════════════════════════════════════════ */}
      {activeTab === 'balance12' && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Balance de Sumas y Saldos — 12 Columnas</CardTitle>
          </CardHeader>
          <div className="px-5 pb-2">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-xs text-blue-700 mb-4">
              💡 Las <strong>Columnas 1-2</strong> muestran los totales acumulados de Debe y Haber. Las <strong>3-4</strong> el saldo resultante. Las <strong>5-6</strong> llevan los ajustes de cierre. Las <strong>7-8</strong> los saldos ajustados. Las <strong>9-10</strong> el Estado de Resultados y las <strong>11-12</strong> el Balance General.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-2 py-2 text-left sticky left-0 bg-slate-800" rowSpan={2}>Código</th>
                  <th className="px-2 py-2 text-left sticky left-12 bg-slate-800" rowSpan={2}>Cuenta</th>
                  <th className="px-2 py-2 text-center border-l border-slate-600" colSpan={2}>1-2. Sumas</th>
                  <th className="px-2 py-2 text-center border-l border-slate-600" colSpan={2}>3-4. Saldos</th>
                  <th className="px-2 py-2 text-center border-l border-slate-600" colSpan={2}>5-6. Ajustes</th>
                  <th className="px-2 py-2 text-center border-l border-slate-600" colSpan={2}>7-8. Sald. Aj.</th>
                  <th className="px-2 py-2 text-center border-l border-slate-600" colSpan={2}>9-10. Est. Result.</th>
                  <th className="px-2 py-2 text-center border-l border-slate-600" colSpan={2}>11-12. Bal. Gral.</th>
                </tr>
                <tr className="bg-slate-700 text-white">
                  <th className="px-2 py-1 text-right text-blue-300 border-l border-slate-600">Debe</th>
                  <th className="px-2 py-1 text-right text-green-300">Haber</th>
                  <th className="px-2 py-1 text-right text-blue-300 border-l border-slate-600">Deudor</th>
                  <th className="px-2 py-1 text-right text-green-300">Acreedor</th>
                  <th className="px-2 py-1 text-right text-blue-300 border-l border-slate-600">Debe</th>
                  <th className="px-2 py-1 text-right text-green-300">Haber</th>
                  <th className="px-2 py-1 text-right text-blue-300 border-l border-slate-600">Deudor</th>
                  <th className="px-2 py-1 text-right text-green-300">Acreedor</th>
                  <th className="px-2 py-1 text-right text-red-300 border-l border-slate-600">Pérdidas</th>
                  <th className="px-2 py-1 text-right text-green-300">Ganancias</th>
                  <th className="px-2 py-1 text-right text-blue-300 border-l border-slate-600">Activo</th>
                  <th className="px-2 py-1 text-right text-orange-300">Pasivo</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((r, i) => (
                  <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`}>
                    <td className="px-2 py-1.5 font-mono text-slate-500 sticky left-0 bg-inherit">{r.code}</td>
                    <td className="px-2 py-1.5 text-slate-800 max-w-[160px] truncate sticky left-12 bg-inherit">{r.name}</td>
                    <td className="px-2 py-1.5 text-right text-blue-700 border-l border-slate-100">{r.sumasDebe > 0 ? formatCurrency(r.sumasDebe) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-green-700">{r.sumasHaber > 0 ? formatCurrency(r.sumasHaber) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-blue-700 border-l border-slate-100">{r.saldoDeudor > 0 ? formatCurrency(r.saldoDeudor) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-green-700">{r.saldoAcreedor > 0 ? formatCurrency(r.saldoAcreedor) : ''}</td>
                    <td className="px-2 py-1.5 text-center text-slate-300 border-l border-slate-100">—</td>
                    <td className="px-2 py-1.5 text-center text-slate-300">—</td>
                    <td className="px-2 py-1.5 text-right text-blue-700 border-l border-slate-100">{r.saldoDeudor > 0 ? formatCurrency(r.saldoDeudor) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-green-700">{r.saldoAcreedor > 0 ? formatCurrency(r.saldoAcreedor) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-red-600 border-l border-slate-100">{r.erPerdidas > 0 ? formatCurrency(r.erPerdidas) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-green-700">{r.erGanancias > 0 ? formatCurrency(r.erGanancias) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-blue-700 border-l border-slate-100">{r.bgActivo > 0 ? formatCurrency(r.bgActivo) : ''}</td>
                    <td className="px-2 py-1.5 text-right text-orange-700">{r.bgPasivo > 0 ? formatCurrency(r.bgPasivo) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold">
                  <td colSpan={2} className="px-2 py-2 text-left">TOTALES</td>
                  <td className="px-2 py-2 text-right text-blue-300 border-l border-slate-600">
                    {formatCurrency(trialBalance.reduce((s,r)=>s+r.sumasDebe,0))}
                  </td>
                  <td className="px-2 py-2 text-right text-green-300">
                    {formatCurrency(trialBalance.reduce((s,r)=>s+r.sumasHaber,0))}
                  </td>
                  <td className="px-2 py-2 text-right text-blue-300 border-l border-slate-600">
                    {formatCurrency(trialBalance.reduce((s,r)=>s+r.saldoDeudor,0))}
                  </td>
                  <td className="px-2 py-2 text-right text-green-300">
                    {formatCurrency(trialBalance.reduce((s,r)=>s+r.saldoAcreedor,0))}
                  </td>
                  <td colSpan={4} className="px-2 py-2 text-center text-slate-400 border-l border-slate-600">sin ajustes</td>
                  <td className="px-2 py-2 text-right text-red-300 border-l border-slate-600">{formatCurrency(erPerdidas)}</td>
                  <td className="px-2 py-2 text-right text-green-300">{formatCurrency(erGanancias)}</td>
                  <td className="px-2 py-2 text-right text-blue-300 border-l border-slate-600">
                    {formatCurrency(trialBalance.reduce((s,r)=>s+r.bgActivo,0))}
                  </td>
                  <td className="px-2 py-2 text-right text-orange-300">
                    {formatCurrency(trialBalance.reduce((s,r)=>s+r.bgPasivo,0))}
                  </td>
                </tr>
                <tr className={`font-bold text-sm ${resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <td colSpan={10} className="px-2 py-2 text-right text-slate-700">
                    Resultado del ejercicio ({resultado >= 0 ? 'Ganancia' : 'Pérdida'}):
                  </td>
                  <td colSpan={2} className={`px-2 py-2 text-right border-l border-slate-200 ${resultado >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(resultado))}
                  </td>
                  <td colSpan={2} className={`px-2 py-2 text-right border-l border-slate-200 ${resultado >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(resultado))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ═══ ESTADO DE RESULTADOS ═══════════════════════════════════════════ */}
      {activeTab === 'resultados' && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardHeader><CardTitle>📈 Estado de Resultados</CardTitle></CardHeader>
            <CardContent>
              {/* Ingresos */}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ingresos</h3>
                {trialBalance.filter(r => r.type === 'ingreso' && r.erGanancias > 0).map(r => (
                  <div key={r.id} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                    <span className="text-slate-600"><span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}</span>
                    <span className="font-medium text-green-700">{formatCurrency(r.erGanancias)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 text-sm font-bold border-t border-slate-200 mt-1">
                  <span className="text-slate-800">Total Ingresos</span>
                  <span className="text-green-700">{formatCurrency(erGanancias)}</span>
                </div>
              </div>

              {/* Costos */}
              {['5.1', '5.2', '5.3', '5.4'].map(prefix => {
                const grupo = { '5.1': 'Costo de Ventas', '5.2': 'Gastos de Comercialización', '5.3': 'Gastos de Administración', '5.4': 'Gastos Financieros' }
                const rows = trialBalance.filter(r => r.type === 'egreso' && r.code.startsWith(prefix) && r.erPerdidas > 0)
                if (rows.length === 0) return null
                return (
                  <div key={prefix} className="mb-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{grupo[prefix as keyof typeof grupo]}</h3>
                    {rows.map(r => (
                      <div key={r.id} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                        <span className="text-slate-600"><span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}</span>
                        <span className="font-medium text-red-600">({formatCurrency(r.erPerdidas)})</span>
                      </div>
                    ))}
                  </div>
                )
              })}

              <div className="flex justify-between py-2 text-sm font-bold border-t border-slate-200">
                <span className="text-slate-800">Total Egresos</span>
                <span className="text-red-600">({formatCurrency(erPerdidas)})</span>
              </div>

              {/* Resultado */}
              <div className={`flex justify-between py-4 mt-2 rounded-xl px-4 text-lg font-bold ${resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className={resultado >= 0 ? 'text-green-800' : 'text-red-800'}>
                  {resultado >= 0 ? '✅ Resultado del Ejercicio (Ganancia)' : '❌ Resultado del Ejercicio (Pérdida)'}
                </span>
                <span className={resultado >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(Math.abs(resultado))}</span>
              </div>

              <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-xs text-blue-700">
                💡 El Estado de Resultados muestra si la empresa ganó o perdió dinero en el período. <strong>Ingresos - Egresos = Resultado</strong>. Si es positivo hay ganancia; si es negativo, pérdida.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ LIBRO IVA ══════════════════════════════════════════════════════ */}
      {activeTab === 'iva' && (
        <div className="space-y-4">
          {/* Resumen posición fiscal */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">IVA Débito (ventas)</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(ivaDebito)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">IVA Crédito (compras)</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(ivaCredito)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Posición fiscal</p>
                <p className={`text-2xl font-bold ${saldoTecnico > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {saldoTecnico > 0 ? `A pagar ${formatCurrency(saldoTecnico)}` : `A favor ${formatCurrency(Math.abs(saldoTecnico))}`}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg text-xs text-amber-700">
            💡 <strong>IVA estimado:</strong> Calculado asumiendo precios con IVA 21% incluido (neto = total ÷ 1,21). Solo aplica a empresas <strong>Responsables Inscriptos</strong>. Monotributistas no declaran IVA.
          </div>

          {/* Sub-tabs ventas/compras */}
          <div className="flex gap-2">
            {(['ventas', 'compras'] as const).map(t => (
              <button key={t} onClick={() => setIvaSubTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ivaSubTab === t ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}>
                {t === 'ventas' ? '📤 Libro IVA Ventas' : '📥 Libro IVA Compras'}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">
                      {ivaSubTab === 'ventas' ? 'Cliente' : 'Proveedor'}
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">CUIT</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Neto Gravado</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">IVA 21%</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {libroIVA[ivaSubTab].map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(r.date)}</td>
                      <td className="px-4 py-2.5 text-slate-800">{r.nombre}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.cuit}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(r.neto)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-blue-700">{formatCurrency(r.iva)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-slate-700">Total</td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {formatCurrency(libroIVA[ivaSubTab].reduce((s,r)=>s+r.neto,0))}
                    </td>
                    <td className="px-4 py-2 text-right text-blue-700">
                      {formatCurrency(libroIVA[ivaSubTab].reduce((s,r)=>s+r.iva,0))}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-800">
                      {formatCurrency(libroIVA[ivaSubTab].reduce((s,r)=>s+r.total,0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ DDJJ ARCA / AFIP ═══════════════════════════════════════════════ */}
      {activeTab === 'ddjj' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            ⚠️ <strong>Modo educativo:</strong> Estos formularios son representaciones simplificadas para fines pedagógicos. Los montos son estimados. Para presentaciones reales usá el sistema ARCA/AFIP oficial.
          </div>

          {/* F.731 — IVA Mensual */}
          <Card>
            <CardHeader>
              <CardTitle>🏛️ F.731 — Declaración Jurada Mensual IVA (ARCA)</CardTitle>
              <Badge variant="info">Responsables Inscriptos</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Empresa</span>
                  <span className="font-medium">{companyName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">CUIT</span>
                  <span className="font-mono font-medium">{companyCuit}</span>
                </div>
                <div className="mt-4 font-semibold text-slate-700 text-xs uppercase tracking-widest">I. Débito Fiscal (Ventas)</div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Base imponible neta (ventas gravadas 21%)</span>
                  <span>{formatCurrency(libroIVA.ventas.reduce((s,r)=>s+r.neto,0))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">IVA débito fiscal 21%</span>
                  <span className="font-bold text-blue-700">{formatCurrency(ivaDebito)}</span>
                </div>
                <div className="mt-3 font-semibold text-slate-700 text-xs uppercase tracking-widest">II. Crédito Fiscal (Compras)</div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Base imponible neta (compras gravadas 21%)</span>
                  <span>{formatCurrency(libroIVA.compras.reduce((s,r)=>s+r.neto,0))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">IVA crédito fiscal 21%</span>
                  <span className="font-bold text-green-700">{formatCurrency(ivaCredito)}</span>
                </div>
                <div className={`flex justify-between py-3 px-4 rounded-lg mt-3 font-bold ${saldoTecnico > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <span className={saldoTecnico > 0 ? 'text-red-800' : 'text-green-800'}>
                    {saldoTecnico > 0 ? 'SALDO A INGRESAR (Fisco)' : 'SALDO A FAVOR (contribuyente)'}
                  </span>
                  <span className={saldoTecnico > 0 ? 'text-red-700' : 'text-green-700'}>
                    {formatCurrency(Math.abs(saldoTecnico))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IIBB Simplificado */}
          <Card>
            <CardHeader>
              <CardTitle>🏛️ Ingresos Brutos — Declaración Estimada</CardTitle>
              <Badge variant="warning">Provincial</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {(() => {
                  const baseIIBB = libroIVA.ventas.reduce((s,r)=>s+r.neto,0)
                  const alicuota = 0.03
                  const impuesto = baseIIBB * alicuota
                  return (
                    <>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Base imponible (ingresos netos del período)</span>
                        <span>{formatCurrency(baseIIBB)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Alícuota estimada (comercio minorista)</span>
                        <span>3,00%</span>
                      </div>
                      <div className="flex justify-between py-3 px-4 rounded-lg bg-orange-50 font-bold mt-2">
                        <span className="text-orange-800">IMPUESTO ESTIMADO A PAGAR</span>
                        <span className="text-orange-700">{formatCurrency(impuesto)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">⚠️ La alícuota real varía según jurisdicción, actividad y régimen (local o convenio multilateral CM05).</p>
                    </>
                  )
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Ganancias */}
          <Card>
            <CardHeader>
              <CardTitle>🏛️ Impuesto a las Ganancias — Información</CardTitle>
              <Badge variant="default">Anual</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Resultado contable del ejercicio</span>
                  <span className={`font-bold ${resultado >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {resultado >= 0 ? '' : '('}{formatCurrency(Math.abs(resultado))}{resultado >= 0 ? '' : ')'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Alícuota (SRL/SA — 35%)</span>
                  <span>35%</span>
                </div>
                {resultado > 0 && (
                  <div className="flex justify-between py-3 px-4 rounded-lg bg-slate-50 font-bold mt-2">
                    <span className="text-slate-800">IMPUESTO ESTIMADO</span>
                    <span className="text-slate-700">{formatCurrency(resultado * 0.35)}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-3">
                  💡 Ganancias se presenta anualmente (Formulario F.713 para personas jurídicas). El resultado impositivo puede diferir del contable por ajustes de la Ley del Impuesto a las Ganancias.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ MODAL DETALLE DE ASIENTO ═══════════════════════════════════════ */}
      <Modal open={!!selectedEntry} onClose={() => setSelectedEntry(null)} title="Detalle del asiento" size="lg">
        {selectedEntry && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div><span className="font-medium">Fecha:</span> {formatDate(selectedEntry.date)}</div>
              <div><span className="font-medium">Tipo:</span>{' '}
                <Badge variant={selectedEntry.entry_type === 'manual' ? 'warning' : 'info'}>{selectedEntry.entry_type}</Badge>
              </div>
              <div className="col-span-2"><span className="font-medium">Descripción:</span> {selectedEntry.description}</div>
            </div>

            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Cuenta</th>
                  <th className="text-right px-4 py-2 text-xs text-blue-500 font-medium">Debe</th>
                  <th className="text-right px-4 py-2 text-xs text-green-500 font-medium">Haber</th>
                </tr>
              </thead>
              <tbody>
                {(selectedEntry.lines ?? []).map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-800">
                      <span className="font-mono text-xs text-slate-400 mr-2">{l.account?.code}</span>
                      {l.account?.name}
                      {l.description && <p className="text-xs text-slate-400 mt-0.5">{l.description}</p>}
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${Number(l.debit) > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                      {Number(l.debit) > 0 ? formatCurrency(Number(l.debit)) : '—'}
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${Number(l.credit) > 0 ? 'text-green-700' : 'text-slate-300'}`}>
                      {Number(l.credit) > 0 ? formatCurrency(Number(l.credit)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-2 text-slate-700">Total</td>
                  <td className="px-4 py-2 text-right text-blue-700">
                    {formatCurrency((selectedEntry.lines ?? []).reduce((s, l) => s + Number(l.debit),  0))}
                  </td>
                  <td className="px-4 py-2 text-right text-green-700">
                    {formatCurrency((selectedEntry.lines ?? []).reduce((s, l) => s + Number(l.credit), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg text-sm text-blue-700">
              <p className="font-semibold mb-1">💡 Principio de partida doble</p>
              <p>Todo movimiento afecta al menos dos cuentas. El total <strong className="text-blue-700">Debe</strong> siempre iguala al total <strong className="text-green-700">Haber</strong>. Así la contabilidad mantiene el equilibrio permanente.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
