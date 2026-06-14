'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createManualJournalEntry, JOURNAL_TEMPLATES } from '@/lib/accounting/entries'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/cn'

interface Account {
  id: string; code: string; name: string; type: string
}
interface Line {
  accountId: string; debit: string; credit: string; description: string
}

const emptyLine = (): Line => ({ accountId: '', debit: '', credit: '', description: '' })

export default function NewJournalEntryPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [accounts,    setAccounts]    = useState<Account[]>([])
  const [companyId,   setCompanyId]   = useState('')
  const [userId,      setUserId]      = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [lines,       setLines]       = useState<Line[]>([emptyLine(), emptyLine()])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [templateCode, setTemplateCode] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: company } = await supabase.from('companies').select('id')
        .eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      if (!company) return
      setCompanyId(company.id)

      const { data: accs } = await supabase.from('chart_of_accounts')
        .select('id, code, name, type').eq('company_id', company.id)
        .eq('is_active', true).order('code')
      setAccounts(accs ?? [])
    }
    load()
  }, [])

  // Totales calculados
  const totalDebe  = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0), [lines])
  const totalHaber = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0), [lines])
  const balanced   = Math.abs(totalDebe - totalHaber) <= 0.01

  // Aplicar template
  function applyTemplate(code: string) {
    const tpl = JOURNAL_TEMPLATES.find(t => t.code === code)
    if (!tpl) return
    setDescription(tpl.title)
    setTemplateCode(code)
    const newLines: Line[] = tpl.lines.map((tl) => {
      const acc = accounts.find(a => a.code === tl.accountCode)
      return {
        accountId:   acc?.id ?? '',
        debit:       tl.side === 'debe'  ? '' : '',
        credit:      tl.side === 'haber' ? '' : '',
        description: tl.label,
      }
    })
    // Dejar un campo vacío para completar el monto
    setLines([...newLines, emptyLine()])
  }

  function updateLine(i: number, field: keyof Line, value: string) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function addLine() {
    setLines(prev => [...prev, emptyLine()])
  }

  function removeLine(i: number) {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    setError('')
    if (!description.trim()) { setError('Ingresá una descripción.'); return }
    if (lines.filter(l => l.accountId).length < 2) { setError('El asiento necesita al menos 2 cuentas.'); return }
    if (!balanced) { setError(`El asiento no balancea: Debe ${formatCurrency(totalDebe)} ≠ Haber ${formatCurrency(totalHaber)}`); return }

    const validLines = lines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    setSaving(true)

    const { error: saveError } = await createManualJournalEntry({
      companyId,
      createdBy: userId,
      date,
      description,
      lines: validLines.map(l => ({
        accountId:   l.accountId,
        debit:       parseFloat(l.debit)  || 0,
        credit:      parseFloat(l.credit) || 0,
        description: l.description,
      })),
    })

    setSaving(false)
    if (saveError) { setError(saveError); return }
    router.push('/accounting')
  }

  const typeColor = (t: string) =>
    t === 'activo' ? 'text-blue-700' : t === 'pasivo' ? 'text-red-700' : t === 'ingreso' ? 'text-green-700' : t === 'egreso' ? 'text-orange-700' : 'text-slate-700'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/accounting')} className="text-slate-400 hover:text-slate-600 text-sm">
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nuevo asiento manual</h1>
          <p className="text-slate-500 text-sm mt-0.5">Registrá un asiento contable manualmente con partida doble.</p>
        </div>
      </div>

      {/* Panel educativo */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg text-sm text-blue-700 space-y-1">
        <p className="font-semibold">💡 Partida doble</p>
        <p>Cada asiento afecta al menos dos cuentas. El total de la columna <strong>Debe</strong> siempre debe igualar el total de la columna <strong>Haber</strong>. Si Debe &gt; Haber → la cuenta deudora aumenta; si Haber &gt; Debe → la cuenta acreedora aumenta.</p>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Modelos de asientos sugeridos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {JOURNAL_TEMPLATES.map(t => (
              <button key={t.code} onClick={() => applyTemplate(t.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  templateCode === t.code
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-700'
                }`}>
                {t.title}
              </button>
            ))}
          </div>
          {templateCode && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
              {JOURNAL_TEMPLATES.find(t => t.code === templateCode)?.description}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Fecha y descripción */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción del asiento</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Pago de alquiler del local"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Tabla de líneas */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium uppercase tracking-wide w-[40%]">Cuenta</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium uppercase tracking-wide">Concepto</th>
                  <th className="px-4 py-2.5 text-xs text-blue-500 font-medium uppercase tracking-wide text-right">Debe</th>
                  <th className="px-4 py-2.5 text-xs text-green-500 font-medium uppercase tracking-wide text-right">Haber</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const acc = accounts.find(a => a.id === line.accountId)
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <select value={line.accountId} onChange={e => updateLine(i, 'accountId', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500">
                          <option value="">— Seleccionar cuenta —</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                          ))}
                        </select>
                        {acc && (
                          <span className={`text-xs mt-0.5 block ${typeColor(acc.type)}`}>{acc.type}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={line.description}
                          onChange={e => updateLine(i, 'description', e.target.value)}
                          placeholder="Opcional"
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm text-slate-900 focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min="0" step="0.01" value={line.debit}
                          onChange={e => {
                            updateLine(i, 'debit', e.target.value)
                            if (e.target.value) updateLine(i, 'credit', '')
                          }}
                          placeholder="0,00"
                          className="w-28 px-2 py-1.5 rounded border border-slate-300 text-sm text-right text-blue-700 font-medium focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min="0" step="0.01" value={line.credit}
                          onChange={e => {
                            updateLine(i, 'credit', e.target.value)
                            if (e.target.value) updateLine(i, 'debit', '')
                          }}
                          placeholder="0,00"
                          className="w-28 px-2 py-1.5 rounded border border-slate-300 text-sm text-right text-green-700 font-medium focus:ring-1 focus:ring-green-500" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeLine(i)} disabled={lines.length <= 2}
                          className="text-slate-300 hover:text-red-400 disabled:opacity-20 text-lg leading-none">
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className={`border-t-2 ${balanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                  <td colSpan={2} className="px-4 py-3 text-sm font-bold text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(totalDebe)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(totalHaber)}</td>
                  <td />
                </tr>
                {!balanced && totalDebe > 0 && totalHaber > 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-xs text-red-600 font-medium">
                      ⚠️ Diferencia: {formatCurrency(Math.abs(totalDebe - totalHaber))} — el asiento debe balancear.
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          <button onClick={addLine} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            + Agregar línea
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Panel ¿cuándo usar Debe/Haber? */}
          <details className="bg-slate-50 rounded-xl overflow-hidden">
            <summary className="px-4 py-3 text-sm font-medium text-slate-600 cursor-pointer select-none">
              💡 ¿Cómo sé si una cuenta va al Debe o al Haber?
            </summary>
            <div className="px-4 pb-4 text-xs text-slate-600 space-y-2">
              <table className="w-full border-collapse mt-2">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-3 py-2">Tipo de cuenta</th>
                    <th className="px-3 py-2 text-blue-600">Debe (aumenta)</th>
                    <th className="px-3 py-2 text-green-600">Haber (disminuye)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200">
                    <td className="px-3 py-1.5 font-medium text-blue-700">Activo</td>
                    <td className="px-3 py-1.5 text-center">✔ Entra/aumenta</td>
                    <td className="px-3 py-1.5 text-center">Sale/disminuye</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-3 py-1.5 font-medium text-red-700">Pasivo</td>
                    <td className="px-3 py-1.5 text-center">Paga/disminuye</td>
                    <td className="px-3 py-1.5 text-center">✔ Se contrae/aumenta</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-3 py-1.5 font-medium text-purple-700">Patrimonio</td>
                    <td className="px-3 py-1.5 text-center">Retiro</td>
                    <td className="px-3 py-1.5 text-center">✔ Aporte/aumenta</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-3 py-1.5 font-medium text-green-700">Ingresos</td>
                    <td className="px-3 py-1.5 text-center">Anulación</td>
                    <td className="px-3 py-1.5 text-center">✔ Ingreso ganado</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-3 py-1.5 font-medium text-orange-700">Egresos</td>
                    <td className="px-3 py-1.5 text-center">✔ Gasto incurrido</td>
                    <td className="px-3 py-1.5 text-center">Reversión</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => router.push('/accounting')} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!balanced || lines.filter(l=>l.accountId).length < 2} className="flex-1">
              Guardar asiento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
