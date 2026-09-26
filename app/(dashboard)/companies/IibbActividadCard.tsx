'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IIBB_ACTIVITIES, ACTIVITY_CATEGORIES, resolverActividad } from '@/lib/constants/iibb-misiones'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Props {
  companyId: string
  currentRate: number
  /** Código guardado en companies.iibb_activity_code. Nulo en empresas creadas
   *  antes de que existiera la columna. */
  currentCode: string | null
}

export function IibbActividadCard({ companyId, currentRate, currentCode }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const { actividad: inicial, confirmada } = resolverActividad(currentCode, currentRate)

  const [actividad, setActividad] = useState(inicial?.code ?? '')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [err, setErr]             = useState('')

  const elegida   = IIBB_ACTIVITIES.find(a => a.code === actividad)
  const nuevaAlic = elegida ? elegida.rate : 0
  // Se compara por código, no por alícuota: dos actividades distintas pueden
  // compartirla, y antes el botón quedaba deshabilitado al cambiar entre ellas.
  const cambia    = (currentCode ?? '') !== actividad || !confirmada

  async function guardar() {
    setSaving(true)
    setMsg(''); setErr('')
    const { error } = await supabase
      .from('companies')
      .update({ iibb_rate: nuevaAlic, iibb_activity_code: actividad || null })
      .eq('id', companyId)

    setSaving(false)
    if (error) { setErr(`No se pudo guardar: ${error.message}`); return }
    setMsg(
      elegida
        ? `Actividad registrada: ${elegida.code} — ${elegida.name}, alícuota ${(nuevaAlic * 100).toFixed(1)}%.`
        : 'Se registró la empresa como exenta: no se devengará IIBB en las ventas.'
    )
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

        {!confirmada && inicial && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Esta empresa se creó cuando sólo se guardaba la alícuota, así que la actividad de abajo es una
            <strong> suposición</strong> a partir del {(Number(currentRate) * 100).toFixed(1)}%.
            Varias actividades comparten alícuota: confirmá cuál es la tuya y guardá.
          </p>
        )}

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
            {elegida && nuevaAlic !== Number(currentRate) && (
              <> → pasaría a <strong className="text-purple-700">{(nuevaAlic * 100).toFixed(1)}%</strong></>
            )}
          </p>
          <Button onClick={guardar} loading={saving} disabled={!cambia}>
            {confirmada ? 'Guardar actividad' : 'Confirmar actividad'}
          </Button>
        </div>

        {msg && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-3">{msg}</p>}
        {err && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{err}</p>}

        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
          Cambiar la alícuota afecta a las ventas que registres de ahora en más. Los asientos ya emitidos
          conservan la alícuota con la que se generaron.
        </p>
      </CardContent>
    </Card>
  )
}
