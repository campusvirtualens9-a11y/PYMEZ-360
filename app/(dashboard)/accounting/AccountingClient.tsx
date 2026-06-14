'use client'

import { useState } from 'react'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/utils/cn'

interface Props { entries: any[]; companyId: string; userId: string }

export default function AccountingClient({ entries, companyId, userId }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [journalViewed, setJournalViewed] = useState(false)

  async function openEntry(entry: any) {
    setSelectedEntry(entry)
    if (!journalViewed) {
      await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'VIEW_JOURNAL' })
      await awardXp({ profileId: userId, companyId, amount: 10, reason: 'Libro diario consultado' })
      setJournalViewed(true)
    }
  }

  const typeLabel: Record<string, string> = {
    activo: 'Activo', pasivo: 'Pasivo', ingreso: 'Ingreso', egreso: 'Egreso', patrimonio: 'Patrimonio',
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>📒 Libro Diario</CardTitle>
          <Badge variant="info">{entries.length} asientos</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Aún no hay asientos. Se generan automáticamente al registrar compras, ventas, cobros y pagos.
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
                {entries.map((e) => {
                  const totalDebit = (e.lines ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0)
                  return (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => openEntry(e)}>
                      <td className="px-5 py-3 text-slate-600">{formatDate(e.date)}</td>
                      <td className="px-5 py-3 text-slate-800">{e.description}</td>
                      <td className="px-5 py-3">
                        <Badge variant={e.entry_type === 'automatico' ? 'info' : 'default'}>
                          {e.entry_type}
                        </Badge>
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

      {/* Detalle de asiento */}
      <Modal open={!!selectedEntry} onClose={() => setSelectedEntry(null)} title="Detalle del asiento" size="lg">
        {selectedEntry && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div><span className="font-medium">Fecha:</span> {formatDate(selectedEntry.date)}</div>
              <div><span className="font-medium">Tipo:</span> {selectedEntry.entry_type}</div>
              <div className="col-span-2"><span className="font-medium">Descripción:</span> {selectedEntry.description}</div>
            </div>

            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Cuenta</th>
                  <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Debe</th>
                  <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Haber</th>
                </tr>
              </thead>
              <tbody>
                {(selectedEntry.lines ?? []).map((l: any) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-800">
                      <span className="font-mono text-xs text-slate-400 mr-2">{l.account?.code}</span>
                      {l.account?.name}
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
                    {formatCurrency((selectedEntry.lines ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0))}
                  </td>
                  <td className="px-4 py-2 text-right text-green-700">
                    {formatCurrency((selectedEntry.lines ?? []).reduce((s: number, l: any) => s + Number(l.credit), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Explicación educativa */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg text-sm text-blue-700">
              <p className="font-semibold mb-1">💡 ¿Cómo leer este asiento?</p>
              <p>Las cuentas en <strong className="text-blue-700">Debe</strong> aumentan el activo o los egresos. Las cuentas en <strong className="text-green-700">Haber</strong> aumentan el pasivo, el patrimonio o los ingresos. El total Debe siempre debe ser igual al total Haber: la contabilidad siempre está en equilibrio.</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
