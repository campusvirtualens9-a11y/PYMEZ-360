'use client'

import { useMicroMode } from '@/hooks/useMicroMode'

export function MicroModeToggle({ initialMode }: { initialMode: boolean }) {
  const { mode, loading, toggle } = useMicroMode()
  const active = loading ? initialMode : mode

  return (
    <div className={`rounded-2xl border-2 p-5 transition-colors ${active ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${active ? 'bg-amber-100' : 'bg-slate-100'}`}>
            {active ? '🛍️' : '🏭'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Modo de funcionamiento</h3>
            <p className={`text-xs font-semibold mt-0.5 ${active ? 'text-amber-600' : 'text-slate-500'}`}>
              {active ? 'Microemprendimiento (Monotributista)' : 'General (Responsable Inscripto)'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={toggle}
          disabled={loading}
          className="relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50"
          style={{ backgroundColor: active ? '#f59e0b' : '#94a3b8' }}
          title={active ? 'Desactivar modo microemprendimiento' : 'Activar modo microemprendimiento'}
        >
          <span
            className="pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out"
            style={{ transform: active ? 'translateX(20px)' : 'translateX(0px)' }}
          />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {active ? (
          <>
            <div className="bg-amber-100 rounded-xl p-3 text-xs">
              <p className="font-semibold text-amber-700 mb-1">✅ Módulos activos</p>
              <ul className="space-y-0.5 text-amber-800">
                <li>• Ventas y Compras</li>
                <li>• Clientes y Proveedores</li>
                <li>• Inventario y Tesorería</li>
                <li>• Reportes y Exportación</li>
                <li>• Sincronización con TRIBUT.AR (IIBB)</li>
              </ul>
            </div>
            <div className="bg-slate-100 rounded-xl p-3 text-xs">
              <p className="font-semibold text-slate-500 mb-1">🔒 Módulos bloqueados</p>
              <ul className="space-y-0.5 text-slate-500 line-through">
                <li>Contabilidad (asientos)</li>
                <li>Impuestos (IVA, Ganancias)</li>
              </ul>
              <p className="text-slate-400 mt-1 no-underline" style={{ textDecoration: 'none' }}>
                No aplican a Monotributistas.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-50 rounded-xl p-3 text-xs">
              <p className="font-semibold text-slate-700 mb-1">Modo General activo</p>
              <p className="text-slate-500">
                Todos los módulos disponibles: Contabilidad, IVA, Ganancias, IIBB.
                Diseñado para empresas Responsable Inscripto.
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-xs">
              <p className="font-semibold text-blue-700 mb-1">💡 ¿Sos Monotributista?</p>
              <p className="text-blue-600">
                Activá el modo microemprendimiento para ocultar los módulos de Ganancias,
                IVA y contabilidad formal que no te aplican.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
