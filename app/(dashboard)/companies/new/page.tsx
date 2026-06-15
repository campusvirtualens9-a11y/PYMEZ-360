'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setupCompany } from '@/lib/companies/setup'
import type { BusinessSector } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

const SECTORS = [
  { value: 'comercial',    label: 'PyME Comercial',  icon: '🏪', desc: 'Compra y venta de mercaderías, almacén, distribución.' },
  { value: 'construccion', label: 'Construcción',     icon: '🏗️',  desc: 'Materiales, obras como centros de costo, presupuestos.' },
  { value: 'salud',        label: 'Salud',            icon: '🏥', desc: 'Servicios profesionales, insumos médicos, cobros por prestación.' },
  { value: 'gastronomia',  label: 'Gastronomía',      icon: '🍽️',  desc: 'Insumos, elaboración, ventas diarias, caja diaria.' },
  { value: 'transporte',   label: 'Transporte',       icon: '🚚', desc: 'Servicios de flete, combustible, viajes como centros de costo.' },
]

export default function NewCompanyPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [sector, setSector] = useState<BusinessSector>('comercial')
  const [cuit, setCuit] = useState('20-12345678-9')
  const [address, setAddress] = useState('')
  const [initialCash, setInitialCash] = useState(50000)
  const [initialBank, setInitialBank] = useState(100000)
  const [iibbRate, setIibbRate] = useState(0.03)
  const [iibbIdx,  setIibbIdx]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('El nombre de la empresa es obligatorio.'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: name.trim(),
        sector,
        cuit,
        address,
        iibb_rate: iibbRate,
        owner_id: user.id,
        sim_start_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (companyError || !company) {
      setError('Error al crear la empresa. Intentá de nuevo.')
      setLoading(false)
      return
    }

    await setupCompany({ companyId: company.id, sector, initialCash, initialBank })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Crear empresa simulada</h1>
        <p className="text-slate-500 mt-1">Configurá tu empresa para comenzar a practicar gestión administrativa.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-blue-700' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Step 1: Datos básicos */}
      {step === 1 && (
        <Card>
          <CardContent className="space-y-4 pt-2">
            <h2 className="text-lg font-semibold text-slate-800">Datos de la empresa</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la empresa *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Distribuidora San Martín"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CUIT simulado</label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Domicilio (opcional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. San Martín 1234, Buenos Aires"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <Button onClick={() => { if (!name.trim()) { setError('Nombre obligatorio.'); return }; setError(''); setStep(2) }} className="w-full" size="lg">
              Siguiente →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Rubro */}
      {step === 2 && (
        <Card>
          <CardContent className="space-y-4 pt-2">
            <h2 className="text-lg font-semibold text-slate-800">Elegí el rubro</h2>
            <p className="text-sm text-slate-500">Cada rubro carga datos de ejemplo distintos (productos, clientes, proveedores).</p>

            <div className="grid gap-3">
              {SECTORS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSector(s.value as BusinessSector)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    sector === s.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-3xl">{s.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{s.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                  {sector === s.value && <div className="ml-auto text-blue-600 text-xl">✓</div>}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Anterior</Button>
              <Button onClick={() => setStep(3)} className="flex-1">Siguiente →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Saldo inicial */}
      {step === 3 && (
        <Card>
          <CardContent className="space-y-4 pt-2">
            <h2 className="text-lg font-semibold text-slate-800">Saldo inicial</h2>
            <p className="text-sm text-slate-500">Definí con cuánto dinero arranca tu empresa.</p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Caja inicial (ARS)</label>
              <input
                type="number"
                value={initialCash}
                onChange={(e) => setInitialCash(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banco inicial (ARS)</label>
              <input
                type="number"
                value={initialBank}
                onChange={(e) => setInitialBank(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alícuota Ingresos Brutos (IIBB)</label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-xs text-blue-800 space-y-1">
                <p><strong>Pago mensual</strong> — Se presenta una Declaración Jurada (DDJJ) ante la Dirección General de Rentas (DGR) de cada provincia.</p>
                <p>La base imponible son los <strong>ingresos netos sin IVA</strong> del mes. Vence generalmente el <strong>25 de cada mes</strong>.</p>
                <p className="text-blue-600">→ Misiones: se paga vía DGR Misiones (dgr.misiones.gov.ar) o bancos habilitados.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 0.03,  label: '3%',      desc: 'Misiones (DGR)' },
                  { value: 0.03,  label: '3%',      desc: 'Bs. As. / CABA' },
                  { value: 0.035, label: '3.5%',    desc: 'Córdoba' },
                  { value: 0.02,  label: '2%',      desc: 'Reducida' },
                  { value: 0.015, label: '1.5%',    desc: 'Actividad reducida' },
                  { value: 0,     label: 'Exento',  desc: 'Sin IIBB' },
                ].map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setIibbRate(opt.value); setIibbIdx(idx) }}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-center ${
                      iibbIdx === idx
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-xs font-normal opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Empresa</span><span className="font-medium">{name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Rubro</span><span className="font-medium">{SECTORS.find(s => s.value === sector)?.label}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Caja inicial</span><span className="font-medium">$ {initialCash.toLocaleString('es-AR')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Banco inicial</span><span className="font-medium">$ {initialBank.toLocaleString('es-AR')}</span></div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Anterior</Button>
              <Button onClick={handleCreate} loading={loading} className="flex-1">
                🏢 Crear empresa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
