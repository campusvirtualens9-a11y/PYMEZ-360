'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { validarCuit, formatearCuit } from '@/lib/cuit'

const SECTORES = [
  { value: 'comercial',    label: '🏪 PyME Comercial' },
  { value: 'construccion', label: '🏗️ Construcción' },
  { value: 'salud',        label: '🏥 Salud' },
  { value: 'gastronomia',  label: '🍽️ Gastronomía' },
  { value: 'transporte',   label: '🚚 Transporte' },
]

interface Props {
  companyId: string
  nombre: string
  cuit: string
  domicilio: string | null
  sector: string
  inicio: string | null
}

export function EditarEmpresaCard({ companyId, nombre, cuit, domicilio, sector, inicio }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [open, setOpen]   = useState(false)
  const [nom, setNom]     = useState(nombre)
  const [cu, setCu]       = useState(cuit ?? '')
  const [dom, setDom]     = useState(domicilio ?? '')
  const [sec, setSec]     = useState(sector)
  const [ini, setIni]     = useState((inicio ?? '').slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [okMsg, setOkMsg]   = useState('')

  function abrir() {
    setNom(nombre); setCu(cuit ?? ''); setDom(domicilio ?? '')
    setSec(sector); setIni((inicio ?? '').slice(0, 10))
    setError(''); setOkMsg(''); setOpen(true)
  }

  async function guardar() {
    if (!nom.trim()) { setError('La razón social no puede quedar vacía.'); return }

    const chequeo = validarCuit(cu)
    if (!chequeo.ok) {
      setError(
        chequeo.esperado === undefined
          ? 'El CUIT debe tener 11 dígitos, con el formato XX-XXXXXXXX-X.'
          : `El dígito verificador no corresponde: para ${cu.replace(/\D/g, '').slice(0, 10)} tendría que terminar en ${chequeo.esperado}.`,
      )
      return
    }

    setSaving(true); setError('')
    const { error: err } = await supabase
      .from('companies')
      .update({
        name: nom.trim(),
        cuit: formatearCuit(cu),
        address: dom.trim() || null,
        sector: sec,
        sim_start_date: ini || null,
      })
      .eq('id', companyId)

    setSaving(false)
    if (err) { setError(`No se pudo guardar: ${err.message}`); return }
    setOkMsg('Datos actualizados.')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Datos de la empresa</p>
              <p className="text-xs text-slate-500">
                Razón social, CUIT, domicilio, rubro y fecha de inicio. El CUIT conviene que sea el mismo
                que cargaste en TRIBUT.AR, porque es lo que vincula las dos plataformas.
              </p>
              {okMsg && <p className="text-xs text-emerald-700 mt-2">{okMsg}</p>}
            </div>
            <Button onClick={abrir} variant="secondary">Editar datos</Button>
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar datos de la empresa">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Razón social</label>
            <input
              type="text" value={nom} onChange={e => setNom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CUIT</label>
            <input
              type="text" value={cu} onChange={e => setCu(formatearCuit(e.target.value))}
              placeholder="30-12345678-9" maxLength={13}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Se valida el dígito verificador, igual que en TRIBUT.AR.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domicilio</label>
            <input
              type="text" value={dom} onChange={e => setDom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rubro</label>
            <select
              value={sec} onChange={e => setSec(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SECTORES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <p className="text-[11px] text-amber-600 mt-1">
              Cambiar el rubro no modifica el plan de cuentas ya creado: sólo cambia cómo se describe la empresa.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inicio de actividades</label>
            <input
              type="date" value={ini} onChange={e => setIni(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={guardar} loading={saving}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
