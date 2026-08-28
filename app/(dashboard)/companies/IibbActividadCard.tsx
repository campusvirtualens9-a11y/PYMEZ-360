'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IIBB_ACTIVITIES, ACTIVITY_CATEGORIES } from '@/lib/constants/iibb-misiones'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Props {
  companyId: string
  currentRate: number
}

export function IibbActividadCard({ companyId, currentRate }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  // Se muestra la primera actividad que coincide con la alícuota guardada: sin
  // una columna donde persistir el código, la alícuota es el único dato que hay.
  const sugerida = IIBB_ACTIVITIES.find(a => a.rate === Number(currentRate))

  const [actividad, setActividad] = useState(sugerida?.code ?? '')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  const elegida  = IIBB_ACTIVITIES.find(a => a.code === actividad)
  const nuevaAlic = elegida ? elegida.rate : 0
  const cambia   = Number(currentRate) !== nuevaAlic

  async function guardar() {
    setSaving(true)
    setMsg('')
    const { error } = await supabase
      .from('companies')
      .update({ iibb_rate: nuevaAlic })
      .eq('id', companyId)

    setSaving(false)
    if (error) { setMsg(`No se pudo guardar: ${error.message}`); return }
    setMsg(`Alícuota actualizada a ${(nuevaAlic * 100).toFixed(1)}%.`)
    router.refresh()
  }

  return (
    <Card>
      <CardContent>
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
          Actividad e Ingresos Brutos
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Mismo listado que TRIBUT.AR usa ante ATM Misiones. La alícuota de acá es la que se aplica al devengar
          el IIBB en cada venta, así la contabilidad coincide con la DDJJ.
        </p>

        <select
          value={actividad}
          onChange={(e) => setActividad(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 bg-white text-sm"
        >
          <option value="">— Exento / sin actividad gravada —</option>
          {ACTIVITY_CATEGORIES.map(cat => (
            <optgroup key={cat.key} label={cat.label}>
              {IIBB_ACTIVITIES.filter(a => a.category === cat.key).map(a => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name} ({(a.rate * 100).toFixed(1)}%)
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <p className="text-xs text-slate-600">
            Alícuota actual: <strong>{(Number(currentRate) * 100).toFixed(1)}%</strong>
            {cambia && (
              <> → pasaría a <strong className="text-purple-700">{(nuevaAlic * 100).toFixed(1)}%</strong></>
            )}
          </p>
          <Button onClick={guardar} loading={saving} disabled={!cambia}>
            Guardar actividad
          </Button>
        </div>

        {msg && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-3">{msg}</p>}

        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
          Cambiar la alícuota afecta a las ventas que registres de ahora en más. Los asientos ya emitidos
          conservan la alícuota con la que se generaron.
        </p>
      </CardContent>
    </Card>
  )
}
