import Link from 'next/link'

export function MicroModeBlock({ module }: { module: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-4xl shadow-sm">
        🔒
      </div>
      <div className="max-w-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{module} no disponible</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          En <strong className="text-amber-700">Modo Microemprendimiento</strong>, los módulos de
          contabilidad formal e impuestos del Régimen General están desactivados.
        </p>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Este modo está pensado para <strong>Monotributistas</strong> que gestionan ventas y compras
          sin contabilidad patrimonial ni libros IVA.
        </p>
      </div>
      <Link
        href="/companies"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        🏢 Ir a Mi Empresa → cambiar modo
      </Link>
    </div>
  )
}
