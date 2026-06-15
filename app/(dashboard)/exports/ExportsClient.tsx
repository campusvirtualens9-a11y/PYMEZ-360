'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/cn'

// ─── Types ──────────────────────────────────────────────────────────────────

interface JournalLine {
  id: string; account_id: string; debit: number; credit: number; description: string | null
  account: { id: string; code: string; name: string; type: string } | null
}
interface JournalEntry {
  id: string; date: string; description: string; entry_type: string
  lines: JournalLine[]
}
interface Account { id: string; code: string; name: string; type: string; is_active: boolean }
type RelatedEntity = { name: string; cuit: string | null }
interface SaleRow   { id: string; date: string; total: number; iva_rate?: number; customer: RelatedEntity[] | RelatedEntity | null }
interface PurchaseRow { id: string; date: string; total: number; iva_rate?: number; supplier: RelatedEntity[] | RelatedEntity | null }
interface Company { id: string; name: string; cuit: string; iibb_rate: number; address?: string }

interface Props {
  company: Company
  entries: JournalEntry[]
  accounts: Account[]
  sales: SaleRow[]
  purchases: PurchaseRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap(e: RelatedEntity[] | RelatedEntity | null | undefined): RelatedEntity | null {
  if (!e) return null
  return Array.isArray(e) ? (e[0] ?? null) : e
}

function fmt(n: number) { return formatCurrency(n) }

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const bom = '﻿'
  const content = rows.map(r =>
    r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\r\n')
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Computation functions (mirrors AccountingClient logic) ─────────────────

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
  return accounts.map(acc => {
    const t  = totals[acc.id] ?? { debe: 0, haber: 0 }
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

interface IVARow { date: string; nombre: string; cuit: string; total: number; neto: number; iva: number }

function computeIVARows(rows: (SaleRow | PurchaseRow)[], type: 'sale' | 'purchase'): IVARow[] {
  return rows.map(r => {
    const entity = type === 'sale' ? unwrap((r as SaleRow).customer) : unwrap((r as PurchaseRow).supplier)
    const ivaRate = Number((r as any).iva_rate ?? 0.21)
    const ivaAmt  = ivaRate > 0 ? Number(r.total) * ivaRate / (1 + ivaRate) : 0
    return {
      date:   r.date,
      nombre: entity?.name ?? (type === 'sale' ? 'Consumidor Final' : '—'),
      cuit:   entity?.cuit ?? '—',
      total:  Number(r.total),
      neto:   Number(r.total) - ivaAmt,
      iva:    ivaAmt,
    }
  })
}

type Section = 'libros' | 'informes' | 'ddjj'

// ─── Main component ──────────────────────────────────────────────────────────

export default function ExportsClient({ company, entries, accounts, sales, purchases }: Props) {
  const [section, setSection]   = useState<Section>('libros')
  const [periodoFrom, setPeriodoFrom] = useState('')
  const [periodoTo,   setPeriodoTo]   = useState('')

  // Filtrar por período
  const filteredEntries  = useMemo(() => {
    let r = entries
    if (periodoFrom) r = r.filter(e => e.date >= periodoFrom)
    if (periodoTo)   r = r.filter(e => e.date <= periodoTo)
    return r
  }, [entries, periodoFrom, periodoTo])

  const filteredSales = useMemo(() => {
    let r = sales
    if (periodoFrom) r = r.filter(s => s.date >= periodoFrom)
    if (periodoTo)   r = r.filter(s => s.date <= periodoTo)
    return r
  }, [sales, periodoFrom, periodoTo])

  const filteredPurchases = useMemo(() => {
    let r = purchases
    if (periodoFrom) r = r.filter(p => p.date >= periodoFrom)
    if (periodoTo)   r = r.filter(p => p.date <= periodoTo)
    return r
  }, [purchases, periodoFrom, periodoTo])

  const trialBalance  = useMemo(() => computeTrialBalance(filteredEntries, accounts), [filteredEntries, accounts])
  const ivaVentas     = useMemo(() => computeIVARows(filteredSales, 'sale'),           [filteredSales])
  const ivaCompras    = useMemo(() => computeIVARows(filteredPurchases, 'purchase'),   [filteredPurchases])

  const erGanancias   = trialBalance.reduce((s, r) => s + r.erGanancias, 0)
  const erPerdidas    = trialBalance.reduce((s, r) => s + r.erPerdidas,  0)
  const resultado     = erGanancias - erPerdidas
  const ivaDebito     = ivaVentas.reduce((s, r) => s + r.iva,   0)
  const ivaCredito    = ivaCompras.reduce((s, r) => s + r.iva,  0)
  const saldoTecnico  = ivaDebito - ivaCredito
  const baseIIBB      = ivaVentas.reduce((s, r) => s + r.neto, 0)
  const iibbRate      = Number(company.iibb_rate ?? 0.03)
  const iibbImpuesto  = baseIIBB * iibbRate
  const totalActivo   = trialBalance.reduce((s, r) => s + r.bgActivo, 0)
  const totalPasivo   = trialBalance.reduce((s, r) => s + r.bgPasivo, 0)

  // ── Período label ────────────────────────────────────────────────────────
  const periodoLabel = periodoFrom || periodoTo
    ? `${periodoFrom || '…'} al ${periodoTo || 'hoy'}`
    : 'Todo el período'

  // ── CSV helpers ──────────────────────────────────────────────────────────

  function exportLibroDiario() {
    const header = ['Fecha', 'Descripción', 'Tipo', 'Código cuenta', 'Cuenta', 'Debe', 'Haber']
    const rows = filteredEntries.flatMap(e =>
      (e.lines ?? []).map(l => [
        e.date, e.description, e.entry_type,
        l.account?.code ?? '', l.account?.name ?? '',
        Number(l.debit), Number(l.credit),
      ])
    )
    downloadCSV(`LibroDiario_${company.name}.csv`, [header, ...rows])
  }

  function exportBalance() {
    const header = ['Código', 'Cuenta', 'Tipo', 'Sumas Debe', 'Sumas Haber', 'Saldo Deudor', 'Saldo Acreedor', 'ER Pérdidas', 'ER Ganancias', 'BG Activo', 'BG Pasivo']
    const rows = trialBalance.map(r => [
      r.code, r.name, r.type,
      r.sumasDebe, r.sumasHaber, r.saldoDeudor, r.saldoAcreedor,
      r.erPerdidas, r.erGanancias, r.bgActivo, r.bgPasivo,
    ])
    downloadCSV(`BalanceSumasSaldos_${company.name}.csv`, [header, ...rows])
  }

  function exportIVAVentas() {
    const header = ['Fecha', 'Cliente', 'CUIT', 'Neto Gravado', 'IVA 21%', 'Total']
    const rows = ivaVentas.map(r => [r.date, r.nombre, r.cuit, r.neto.toFixed(2), r.iva.toFixed(2), r.total.toFixed(2)])
    downloadCSV(`LibroIVAVentas_${company.name}.csv`, [header, ...rows])
  }

  function exportIVACompras() {
    const header = ['Fecha', 'Proveedor', 'CUIT', 'Neto Gravado', 'IVA 21%', 'Total']
    const rows = ivaCompras.map(r => [r.date, r.nombre, r.cuit, r.neto.toFixed(2), r.iva.toFixed(2), r.total.toFixed(2)])
    downloadCSV(`LibroIVACompras_${company.name}.csv`, [header, ...rows])
  }

  function exportEstadoResultados() {
    const rows: (string | number)[][] = [
      ['Estado de Resultados', company.name, company.cuit],
      ['Período', periodoLabel],
      [],
      ['INGRESOS'],
      ...trialBalance.filter(r => r.type === 'ingreso' && r.erGanancias > 0)
        .map(r => [r.code, r.name, r.erGanancias]),
      ['', 'Total Ingresos', erGanancias],
      [],
      ['EGRESOS'],
      ...trialBalance.filter(r => r.type === 'egreso' && r.erPerdidas > 0)
        .map(r => [r.code, r.name, r.erPerdidas]),
      ['', 'Total Egresos', erPerdidas],
      [],
      ['', resultado >= 0 ? 'RESULTADO (GANANCIA)' : 'RESULTADO (PÉRDIDA)', resultado],
    ]
    downloadCSV(`EstadoResultados_${company.name}.csv`, rows)
  }

  function exportDDJJIVA() {
    const rows: (string | number)[][] = [
      ['DDJJ IVA — ARCA (F.731) — Solo a efectos educativos'],
      ['Empresa', company.name],
      ['CUIT', company.cuit],
      ['Período', periodoLabel],
      [],
      ['CONCEPTO', 'IMPORTE'],
      ['Base imponible ventas (neto)', ivaVentas.reduce((s,r)=>s+r.neto,0).toFixed(2)],
      ['IVA Débito Fiscal (ventas)', ivaDebito.toFixed(2)],
      ['Base imponible compras (neto)', ivaCompras.reduce((s,r)=>s+r.neto,0).toFixed(2)],
      ['IVA Crédito Fiscal (compras)', ivaCredito.toFixed(2)],
      ['Ajustes de débito', 0],
      ['Ajustes de crédito', 0],
      ['Saldo técnico (Débito − Crédito)', saldoTecnico.toFixed(2)],
      ['Retenciones / percepciones', 0],
      [saldoTecnico >= 0 ? 'SALDO A INGRESAR (Fisco)' : 'SALDO A FAVOR (contribuyente)', Math.abs(saldoTecnico).toFixed(2)],
    ]
    downloadCSV(`DDJJ_IVA_${company.name}_${periodoLabel}.csv`, rows)
  }

  function exportDDJJIIBB() {
    const rows: (string | number)[][] = [
      ['DDJJ Ingresos Brutos — DGR Misiones — Solo a efectos educativos'],
      ['Empresa', company.name],
      ['CUIT', company.cuit],
      ['Provincia', 'Misiones'],
      ['Período', periodoLabel],
      [],
      ['CONCEPTO', 'IMPORTE'],
      ['Ingresos brutos del período (ventas totales)', filteredSales.reduce((s,r)=>s+Number(r.total),0).toFixed(2)],
      ['(-) IVA incluido en ventas', ivaDebito.toFixed(2)],
      ['Base imponible neta (sin IVA)', baseIIBB.toFixed(2)],
      ['Alícuota IIBB', `${(iibbRate*100).toFixed(1)}%`],
      ['Impuesto determinado', iibbImpuesto.toFixed(2)],
      ['(-) Retenciones / percepciones sufridas', 0],
      ['(-) Saldo a favor período anterior', 0],
      ['SALDO A INGRESAR', iibbImpuesto.toFixed(2)],
      [],
      ['Organismo de pago', 'DGR Misiones — dgr.misiones.gov.ar'],
      ['Vencimiento', 'Día 25 del mes siguiente'],
    ]
    downloadCSV(`DDJJ_IIBB_Misiones_${company.name}_${periodoLabel}.csv`, rows)
  }

  function exportDDJJGanancias() {
    const anticipo = resultado > 0 ? resultado * 0.35 * 0.25 / 10 : 0
    const rows: (string | number)[][] = [
      ['Ganancias — Anticipos — Solo a efectos educativos'],
      ['Empresa', company.name],
      ['CUIT', company.cuit],
      ['Período', periodoLabel],
      [],
      ['CONCEPTO', 'IMPORTE'],
      ['Resultado contable del período', resultado.toFixed(2)],
      ['Alícuota Ganancias (SA/SRL)', '35%'],
      ['Impuesto estimado anual', (resultado * 0.35).toFixed(2)],
      ['Anticipos: 10 cuotas de', anticipo.toFixed(2)],
      ['(Cada anticipo = imp. estimado × 25% ÷ 10)'],
      [],
      ['Vencimiento anticipos', 'Día 15 de cada mes (Enero a Octubre)'],
      ['Vencimiento DDJJ anual', 'Junio/Julio del año siguiente al cierre'],
      ['Organismo', 'ARCA (ex AFIP) — afip.gob.ar'],
    ]
    downloadCSV(`Ganancias_Anticipos_${company.name}.csv`, rows)
  }

  function handlePrint() { window.print() }

  // ─── UI ──────────────────────────────────────────────────────────────────

  const SECTIONS: { key: Section; icon: string; label: string }[] = [
    { key: 'libros',   icon: '📒', label: 'Libros Contables'  },
    { key: 'informes', icon: '📊', label: 'Informes Contables' },
    { key: 'ddjj',     icon: '🏛️', label: 'DDJJ / ARCA'       },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exportar</h1>
          <p className="text-slate-500 text-sm mt-0.5">{company.name} · {company.cuit}</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="print:hidden">
          🖨️ Imprimir / PDF
        </Button>
      </div>

      {/* Aviso educativo */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 print:hidden">
        ⚠️ <strong>Modo educativo:</strong> Los valores son los registrados en la simulación. Para presentaciones reales usá el sistema oficial de ARCA (afip.gob.ar) y la DGR Misiones.
      </div>

      {/* Filtro período */}
      <Card className="print:hidden">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Filtrar período:</span>
            <input type="date" value={periodoFrom} onChange={e => setPeriodoFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500" />
            <span className="text-slate-400">→</span>
            <input type="date" value={periodoTo} onChange={e => setPeriodoTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500" />
            {(periodoFrom || periodoTo) && (
              <button onClick={() => { setPeriodoFrom(''); setPeriodoTo('') }}
                className="text-xs text-slate-400 hover:text-slate-600">× Limpiar</button>
            )}
            <span className="text-xs text-slate-500 ml-auto">
              {filteredEntries.length} asientos · {filteredSales.length} ventas · {filteredPurchases.length} compras
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de sección */}
      <div className="flex gap-1 border-b border-slate-200 print:hidden">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              section === s.key
                ? 'bg-white border border-b-white border-slate-200 text-blue-700 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ═══ LIBROS CONTABLES ════════════════════════════════════════════════ */}
      {section === 'libros' && (
        <div className="space-y-6">

          {/* Libro Diario */}
          <Card>
            <CardHeader>
              <CardTitle>📒 Libro Diario</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportLibroDiario}>⬇ CSV</Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase">Fecha</th>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase">Descripción</th>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase">Cuenta</th>
                      <th className="text-right px-4 py-2 text-xs text-blue-500 font-medium uppercase">Debe</th>
                      <th className="text-right px-4 py-2 text-xs text-green-500 font-medium uppercase">Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">Sin asientos en el período.</td></tr>
                    ) : filteredEntries.flatMap(e =>
                      (e.lines ?? []).map((l, i) => (
                        <tr key={`${e.id}-${l.id}`} className={`border-b border-slate-50 hover:bg-slate-50 ${i > 0 ? '' : 'border-t border-slate-200'}`}>
                          <td className="px-4 py-1.5 text-slate-600 align-top">{i === 0 ? formatDate(e.date) : ''}</td>
                          <td className="px-4 py-1.5 text-slate-700 align-top">{i === 0 ? e.description : ''}</td>
                          <td className="px-4 py-1.5 text-slate-700">
                            <span className="font-mono text-xs text-slate-400 mr-1">{l.account?.code}</span>
                            {l.account?.name}
                          </td>
                          <td className="px-4 py-1.5 text-right font-medium text-blue-700">
                            {Number(l.debit) > 0 ? fmt(Number(l.debit)) : ''}
                          </td>
                          <td className="px-4 py-1.5 text-right font-medium text-green-700">
                            {Number(l.credit) > 0 ? fmt(Number(l.credit)) : ''}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredEntries.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-slate-700">TOTALES</td>
                        <td className="px-4 py-2 text-right text-blue-700">
                          {fmt(filteredEntries.flatMap(e=>e.lines??[]).reduce((s,l)=>s+Number(l.debit),0))}
                        </td>
                        <td className="px-4 py-2 text-right text-green-700">
                          {fmt(filteredEntries.flatMap(e=>e.lines??[]).reduce((s,l)=>s+Number(l.credit),0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Balance de Sumas y Saldos */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Balance de Sumas y Saldos (12 columnas)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportBalance}>⬇ CSV</Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-3 py-2 text-slate-500 uppercase" colSpan={2}>Cuenta</th>
                      <th className="text-right px-3 py-2 text-blue-500 uppercase" colSpan={2}>Sumas</th>
                      <th className="text-right px-3 py-2 text-purple-500 uppercase" colSpan={2}>Saldos</th>
                      <th className="text-right px-3 py-2 text-red-500 uppercase" colSpan={2}>E. Resultados</th>
                      <th className="text-right px-3 py-2 text-green-500 uppercase" colSpan={2}>Balance General</th>
                    </tr>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs">
                      <th className="text-left px-3 py-1 text-slate-400">Cód.</th>
                      <th className="text-left px-3 py-1 text-slate-400">Nombre</th>
                      <th className="text-right px-3 py-1 text-blue-400">Debe</th>
                      <th className="text-right px-3 py-1 text-blue-400">Haber</th>
                      <th className="text-right px-3 py-1 text-purple-400">Deudor</th>
                      <th className="text-right px-3 py-1 text-purple-400">Acreedor</th>
                      <th className="text-right px-3 py-1 text-red-400">Pérdidas</th>
                      <th className="text-right px-3 py-1 text-red-400">Ganancias</th>
                      <th className="text-right px-3 py-1 text-green-400">Activo</th>
                      <th className="text-right px-3 py-1 text-green-400">Pasivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.length === 0 ? (
                      <tr><td colSpan={10} className="py-8 text-center text-slate-400">Sin movimientos en el período.</td></tr>
                    ) : trialBalance.map(r => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono text-slate-400">{r.code}</td>
                        <td className="px-3 py-1.5 text-slate-700">{r.name}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">{r.sumasDebe  > 0 ? fmt(r.sumasDebe)  : ''}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">{r.sumasHaber > 0 ? fmt(r.sumasHaber) : ''}</td>
                        <td className="px-3 py-1.5 text-right text-purple-700">{r.saldoDeudor   > 0 ? fmt(r.saldoDeudor)   : ''}</td>
                        <td className="px-3 py-1.5 text-right text-purple-700">{r.saldoAcreedor > 0 ? fmt(r.saldoAcreedor) : ''}</td>
                        <td className="px-3 py-1.5 text-right text-red-600">{r.erPerdidas   > 0 ? fmt(r.erPerdidas)  : ''}</td>
                        <td className="px-3 py-1.5 text-right text-green-700">{r.erGanancias  > 0 ? fmt(r.erGanancias) : ''}</td>
                        <td className="px-3 py-1.5 text-right text-green-700">{r.bgActivo > 0 ? fmt(r.bgActivo) : ''}</td>
                        <td className="px-3 py-1.5 text-right text-red-600">{r.bgPasivo > 0 ? fmt(r.bgPasivo) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  {trialBalance.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-slate-700">TOTALES</td>
                        <td className="px-3 py-2 text-right text-blue-700">{fmt(trialBalance.reduce((s,r)=>s+r.sumasDebe,0))}</td>
                        <td className="px-3 py-2 text-right text-blue-700">{fmt(trialBalance.reduce((s,r)=>s+r.sumasHaber,0))}</td>
                        <td className="px-3 py-2 text-right text-purple-700">{fmt(trialBalance.reduce((s,r)=>s+r.saldoDeudor,0))}</td>
                        <td className="px-3 py-2 text-right text-purple-700">{fmt(trialBalance.reduce((s,r)=>s+r.saldoAcreedor,0))}</td>
                        <td className="px-3 py-2 text-right text-red-600">{fmt(erPerdidas)}</td>
                        <td className="px-3 py-2 text-right text-green-700">{fmt(erGanancias)}</td>
                        <td className="px-3 py-2 text-right text-green-700">{fmt(totalActivo)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{fmt(totalPasivo)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Libros IVA */}
          {(['ventas', 'compras'] as const).map(tipo => {
            const rows = tipo === 'ventas' ? ivaVentas : ivaCompras
            return (
              <Card key={tipo}>
                <CardHeader>
                  <CardTitle>{tipo === 'ventas' ? '📤 Libro IVA Ventas' : '📥 Libro IVA Compras'}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={tipo === 'ventas' ? exportIVAVentas : exportIVACompras}>⬇ CSV</Button>
                    <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[580px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase">Fecha</th>
                          <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase">{tipo === 'ventas' ? 'Cliente' : 'Proveedor'}</th>
                          <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium uppercase">CUIT</th>
                          <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium uppercase">Neto Gravado</th>
                          <th className="text-right px-4 py-2 text-xs text-blue-500 font-medium uppercase">IVA</th>
                          <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm">Sin registros en el período.</td></tr>
                        ) : rows.map((r, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-600">{formatDate(r.date)}</td>
                            <td className="px-4 py-2 text-slate-800">{r.nombre}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-500">{r.cuit}</td>
                            <td className="px-4 py-2 text-right text-slate-700">{fmt(r.neto)}</td>
                            <td className="px-4 py-2 text-right font-medium text-blue-700">{fmt(r.iva)}</td>
                            <td className="px-4 py-2 text-right font-bold text-slate-800">{fmt(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {rows.length > 0 && (
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-slate-700">TOTAL</td>
                            <td className="px-4 py-2 text-right">{fmt(rows.reduce((s,r)=>s+r.neto,0))}</td>
                            <td className="px-4 py-2 text-right text-blue-700">{fmt(rows.reduce((s,r)=>s+r.iva,0))}</td>
                            <td className="px-4 py-2 text-right">{fmt(rows.reduce((s,r)=>s+r.total,0))}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══ INFORMES CONTABLES ══════════════════════════════════════════════ */}
      {section === 'informes' && (
        <div className="space-y-6">

          {/* Estado de Resultados */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Estado de Resultados</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportEstadoResultados}>⬇ CSV</Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 mb-4">{company.name} — {periodoLabel}</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td colSpan={2} className="py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Ingresos</td></tr>
                  {trialBalance.filter(r => r.type === 'ingreso' && r.erGanancias > 0).map(r => (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="py-1.5 text-slate-600">
                        <span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}
                      </td>
                      <td className="py-1.5 text-right font-medium text-green-700">{fmt(r.erGanancias)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 font-bold">
                    <td className="py-2 text-slate-800">Total Ingresos</td>
                    <td className="py-2 text-right text-green-700">{fmt(erGanancias)}</td>
                  </tr>
                  <tr><td colSpan={2} className="pt-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Egresos</td></tr>
                  {['5.1','5.2','5.3','5.4'].map(prefix => {
                    const grp = { '5.1':'Costo de Ventas','5.2':'Gastos Comercialización','5.3':'Gastos Administración','5.4':'Gastos Financieros' }
                    const rows = trialBalance.filter(r => r.type === 'egreso' && r.code.startsWith(prefix) && r.erPerdidas > 0)
                    if (!rows.length) return null
                    return [
                      <tr key={prefix+'-h'}><td colSpan={2} className="pt-2 pb-1 text-xs text-slate-400 italic">{grp[prefix as keyof typeof grp]}</td></tr>,
                      ...rows.map(r => (
                        <tr key={r.id} className="border-b border-slate-50">
                          <td className="py-1.5 text-slate-600 pl-3">
                            <span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}
                          </td>
                          <td className="py-1.5 text-right font-medium text-red-600">({fmt(r.erPerdidas)})</td>
                        </tr>
                      ))
                    ]
                  })}
                  <tr className="border-t border-slate-200 font-bold">
                    <td className="py-2 text-slate-800">Total Egresos</td>
                    <td className="py-2 text-right text-red-600">({fmt(erPerdidas)})</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="pt-2">
                      <div className={`flex justify-between px-4 py-3 rounded-xl font-bold text-base ${resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <span className={resultado >= 0 ? 'text-green-800' : 'text-red-800'}>
                          {resultado >= 0 ? '✅ Resultado (Ganancia)' : '❌ Resultado (Pérdida)'}
                        </span>
                        <span className={resultado >= 0 ? 'text-green-700' : 'text-red-700'}>{fmt(Math.abs(resultado))}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Balance General */}
          <Card>
            <CardHeader>
              <CardTitle>🏛️ Estado de Situación Patrimonial (Balance General)</CardTitle>
              <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 mb-4">{company.name} — {periodoLabel}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">ACTIVO</h3>
                  {trialBalance.filter(r => r.type === 'activo' && r.bgActivo > 0).map(r => (
                    <div key={r.id} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                      <span className="text-slate-600"><span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}</span>
                      <span className="font-medium text-slate-800">{fmt(r.bgActivo)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t border-slate-300 font-bold text-sm mt-1">
                    <span>TOTAL ACTIVO</span><span className="text-green-700">{fmt(totalActivo)}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">PASIVO Y PATRIMONIO</h3>
                  {trialBalance.filter(r => (r.type === 'pasivo' || r.type === 'patrimonio') && r.bgPasivo > 0).map(r => (
                    <div key={r.id} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                      <span className="text-slate-600"><span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>{r.name}</span>
                      <span className="font-medium text-slate-800">{fmt(r.bgPasivo)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t border-slate-300 font-bold text-sm mt-1">
                    <span>TOTAL PASIVO + PAT.</span><span className="text-slate-800">{fmt(totalPasivo)}</span>
                  </div>
                  {resultado !== 0 && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-500">
                      + Resultado del período: {fmt(resultado)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posición IVA */}
          <Card>
            <CardHeader>
              <CardTitle>🧾 Posición Fiscal IVA</CardTitle>
              <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">IVA Débito (ventas)</p>
                  <p className="text-2xl font-bold text-blue-700">{fmt(ivaDebito)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">IVA Crédito (compras)</p>
                  <p className="text-2xl font-bold text-green-700">{fmt(ivaCredito)}</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${saldoTecnico > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${saldoTecnico > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {saldoTecnico > 0 ? 'Saldo a ingresar (Fisco)' : 'Saldo a favor'}
                  </p>
                  <p className={`text-2xl font-bold ${saldoTecnico > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {fmt(Math.abs(saldoTecnico))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ DDJJ ARCA ══════════════════════════════════════════════════════ */}
      {section === 'ddjj' && (
        <div className="space-y-6 max-w-3xl">

          {/* DDJJ IVA */}
          <Card>
            <CardHeader>
              <CardTitle>🏛️ F.731 — DDJJ Mensual IVA (ARCA)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportDDJJIVA}>⬇ CSV</Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {[
                  ['Empresa', company.name],
                  ['CUIT', company.cuit],
                  ['Período', periodoLabel],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{k}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
                <p className="pt-3 text-xs font-bold text-slate-500 uppercase tracking-widest">I. Débito Fiscal (Ventas)</p>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Base imponible neta (ventas gravadas)</span>
                  <span>{fmt(ivaVentas.reduce((s,r)=>s+r.neto,0))}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">IVA Débito Fiscal</span>
                  <span className="font-bold text-blue-700">{fmt(ivaDebito)}</span>
                </div>
                <p className="pt-3 text-xs font-bold text-slate-500 uppercase tracking-widest">II. Crédito Fiscal (Compras)</p>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Base imponible neta (compras gravadas)</span>
                  <span>{fmt(ivaCompras.reduce((s,r)=>s+r.neto,0))}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">IVA Crédito Fiscal</span>
                  <span className="font-bold text-green-700">{fmt(ivaCredito)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Ajustes de débito</span><span>$ 0,00</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Retenciones / percepciones</span><span>$ 0,00</span>
                </div>
                <div className={`flex justify-between py-3 px-4 rounded-xl mt-3 font-bold ${saldoTecnico > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <span className={saldoTecnico > 0 ? 'text-red-800' : 'text-green-800'}>
                    {saldoTecnico > 0 ? 'SALDO A INGRESAR AL FISCO' : 'SALDO A FAVOR DEL CONTRIBUYENTE'}
                  </span>
                  <span className={saldoTecnico > 0 ? 'text-red-700' : 'text-green-700'}>{fmt(Math.abs(saldoTecnico))}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Vencimiento: entre los días 20 y 22 del mes siguiente (según terminación CUIT). Sistema: ARCA — afip.gob.ar</p>
              </div>
            </CardContent>
          </Card>

          {/* DDJJ IIBB Misiones */}
          <Card>
            <CardHeader>
              <CardTitle>🏛️ DDJJ Ingresos Brutos — DGR Misiones</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportDDJJIIBB}>⬇ CSV</Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {[
                  ['Empresa', company.name],
                  ['CUIT', company.cuit],
                  ['Provincia', 'Misiones'],
                  ['Período', periodoLabel],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{k}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Ingresos brutos del período (ventas totales)</span>
                  <span>{fmt(filteredSales.reduce((s,r)=>s+Number(r.total),0))}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">(−) IVA incluido en ventas</span>
                  <span className="text-slate-500">({fmt(ivaDebito)})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                  <span className="text-slate-700">Base imponible neta</span>
                  <span>{fmt(baseIIBB)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Alícuota IIBB (actividad comercial)</span>
                  <span>{(iibbRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Impuesto determinado</span>
                  <span className="font-bold text-orange-700">{fmt(iibbImpuesto)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">(−) Retenciones / percepciones</span><span>$ 0,00</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">(−) Saldo a favor período anterior</span><span>$ 0,00</span>
                </div>
                <div className="flex justify-between py-3 px-4 rounded-xl mt-3 font-bold bg-orange-50">
                  <span className="text-orange-800">SALDO A INGRESAR</span>
                  <span className="text-orange-700">{fmt(iibbImpuesto)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Vencimiento: día 25 del mes siguiente. Sistema: DGR Misiones — dgr.misiones.gov.ar · Bancos habilitados.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ganancias */}
          <Card>
            <CardHeader>
              <CardTitle>🏛️ Impuesto a las Ganancias — Anticipos (ARCA)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportDDJJGanancias}>⬇ CSV</Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>🖨️ PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {[['Empresa', company.name], ['CUIT', company.cuit]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{k}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Resultado contable del período</span>
                  <span className={resultado >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                    {resultado >= 0 ? fmt(resultado) : `(${fmt(Math.abs(resultado))})`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Alícuota Ganancias (SA/SRL)</span><span>35%</span>
                </div>
                {resultado > 0 ? (
                  <>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Impuesto estimado anual</span>
                      <span className="font-bold">{fmt(resultado * 0.35)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Anticipos (10 cuotas de)</span>
                      <span className="font-bold text-slate-800">{fmt(resultado * 0.35 * 0.25 / 10)}</span>
                    </div>
                    <div className="flex justify-between py-3 px-4 rounded-xl mt-3 font-bold bg-slate-50">
                      <span className="text-slate-800">CADA ANTICIPO MENSUAL</span>
                      <span className="text-slate-700">{fmt(resultado * 0.35 * 0.25 / 10)}</span>
                    </div>
                  </>
                ) : (
                  <div className="py-3 px-4 rounded-xl mt-3 bg-green-50 text-green-800 text-sm">
                    Sin ganancia en el período — no corresponde anticipo.
                  </div>
                )}
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>📅 Vencimiento anticipos: día 15 de cada mes (enero a octubre).</p>
                  <p>📅 DDJJ anual (F.713): junio/julio del año siguiente al cierre del ejercicio.</p>
                  <p>🏛️ Sistema: ARCA — afip.gob.ar · Cuenta Tributaria.</p>
                  <p className="text-amber-600">⚠️ El impuesto determinado puede diferir del contable por ajustes impositivos (Ley 20.628).</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
