import Link from 'next/link'
import { LogoPyme, LogoPymeLarge } from '@/components/ui/LogoPyme'

const MODULES = [
  { icon: '🏢', title: 'Empresa',        desc: 'Configurá tu PyME simulada: rubro, CUIT, saldos iniciales y asiento de apertura.' },
  { icon: '👥', title: 'Clientes',       desc: 'Alta de clientes con CUIT, condición IVA y datos de contacto.' },
  { icon: '🏭', title: 'Proveedores',    desc: 'Gestión de proveedores con historial de compras y saldos pendientes.' },
  { icon: '📦', title: 'Productos',      desc: 'Catálogo con stock, precio de costo, precio de venta e IVA por artículo.' },
  { icon: '🛒', title: 'Compras',        desc: 'Registro de facturas A / B / C con tipos de comprobante AFIP. Actualiza stock y cuentas.' },
  { icon: '💰', title: 'Ventas',         desc: 'Emisión de comprobantes de venta con numeración automática y validaciones fiscales.' },
  { icon: '📥', title: 'Cobros',         desc: 'Registro de cobranzas imputadas a facturas de clientes.' },
  { icon: '📤', title: 'Pagos',          desc: 'Pagos a proveedores en efectivo, transferencia o cheque con exportación del documento.' },
  { icon: '🏦', title: 'Tesorería',      desc: 'Cuentas de caja y banco, chequeras y movimientos de fondos en tiempo real.' },
  { icon: '📋', title: 'Inventario',     desc: 'Control de stock con alertas de quiebre y valorización al costo.' },
  { icon: '📒', title: 'Contabilidad',   desc: 'Asientos automáticos por cada operación. Plan de cuentas, diario y balance.' },
  { icon: '🧾', title: 'Impuestos',      desc: 'Liquidación de IVA, Ingresos Brutos y base para Ganancias. Integra con Tribut.ar.' },
  { icon: '📈', title: 'Reportes',       desc: 'Estado de resultados, flujo de fondos y tablero de indicadores clave.' },
  { icon: '🎮', title: 'Desafíos',       desc: 'Sistema de gamificación: puntos XP, logros y progreso para motivar el aprendizaje.' },
  { icon: '🎓', title: 'Examen Final',   desc: 'Evaluación integral de los conocimientos adquiridos durante la simulación.' },
]

const ECOSYSTEM = [
  {
    href:    'https://tributar2026nuevo.vercel.app/dashboard',
    icon:    '🏛️',
    name:    'Tribut.ar',
    tagline: 'Simulador ARCA / AFIP',
    desc:    'Practicá la presentación de DDJJ de IVA, Ganancias y Monotributo ante el organismo fiscal argentino.',
    chips:   ['IVA F.731', 'Ganancias', 'Monotributo', 'DDJJ'],
    color:   'from-purple-600 to-violet-700',
    ring:    'ring-purple-300',
    btn:     'bg-purple-600 hover:bg-purple-700',
  },
  {
    href:    'https://sueldos360.vercel.app/dashboard',
    icon:    '👷',
    name:    'Sueldos 360',
    tagline: 'Liquidación de haberes',
    desc:    'Liquidá sueldos y jornales con recibos de sueldo, SAC, vacaciones y aportes patronales según la LCT.',
    chips:   ['Recibos', 'SAC', 'Vacaciones', 'Aportes'],
    color:   'from-teal-600 to-emerald-700',
    ring:    'ring-teal-300',
    btn:     'bg-teal-600 hover:bg-teal-700',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoPyme size={36} />
            <span className="font-bold text-slate-800 text-lg tracking-tight">PYME 360</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Ingresar
            </Link>
            <Link href="/auth/register"
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
              Registrarse gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="flex justify-center mb-6">
          <LogoPymeLarge />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700 mb-6 uppercase tracking-wide">
          Plataforma educativa · Argentina · 2026
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
          Aprendé a gestionar<br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            una PyME real
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-8">
          Simulá el ciclo completo de una empresa: compras, ventas, cobros, pagos,
          inventario, contabilidad y liquidación impositiva — todo integrado y en contexto argentino.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/auth/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base transition-colors shadow-md">
            Crear empresa simulada →
          </Link>
          <Link href="/auth/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-base border border-slate-300 transition-colors">
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">Sin costo · Sin tarjeta · Datos 100% ficticios y seguros</p>
      </section>

      {/* ── Para quién ───────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
            Ideal para
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { icon: '🎓', label: 'Estudiantes de\nAdministración y Contabilidad' },
              { icon: '👨‍🏫', label: 'Docentes que\nbuscan casos prácticos' },
              { icon: '🚀', label: 'Emprendedores\nen etapa inicial' },
              { icon: '📚', label: 'Instituciones con\nprogramas de formación' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50">
                <span className="text-3xl">{icon}</span>
                <p className="text-xs text-slate-600 font-medium leading-snug whitespace-pre-line">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Módulos ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Todo el ciclo administrativo</h2>
          <p className="text-slate-500 mt-2">15 módulos integrados que reflejan la operatoria real de una PyME argentina</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(({ icon, title, desc }) => (
            <div key={title}
              className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 hover:border-blue-300 hover:shadow-sm transition-all group">
              <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ecosistema ───────────────────────────────────────────────────── */}
      <section className="bg-[#0f172a] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Ecosistema educativo</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Conectado con las herramientas del sistema
            </h2>
            <p className="text-slate-400 mt-2">PYME 360 se integra con apps especializadas para una formación completa</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {ECOSYSTEM.map(app => (
              <div key={app.name}
                className={`rounded-2xl p-6 bg-gradient-to-br ${app.color} text-white ring-1 ${app.ring}/30 shadow-xl`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{app.icon}</span>
                  <div>
                    <p className="font-bold text-lg leading-tight">{app.name}</p>
                    <p className="text-sm opacity-80">{app.tagline}</p>
                  </div>
                </div>
                <p className="text-sm opacity-90 leading-relaxed mb-4">{app.desc}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {app.chips.map(c => (
                    <span key={c} className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">{c}</span>
                  ))}
                </div>
                <a href={app.href} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 ${app.btn} rounded-lg transition-colors`}>
                  Abrir {app.name} ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contexto normativo ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="text-4xl">⚖️</div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg mb-1">Marco normativo argentino</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-3">
                Todos los flujos están adaptados a la legislación vigente:
                tipos de comprobantes AFIP/ARCA, IVA discriminado / no discriminado,
                Ingresos Brutos provincial, plan de cuentas RT 9/17 FACPCE y Ley de Contrato de Trabajo.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Ley 19.550', 'RT 9/17 FACPCE', 'AFIP / ARCA', 'DGR Misiones', 'Ley 20.744 LCT', 'RG 1415 Comprobantes'].map(n => (
                  <span key={n} className="text-xs bg-white border border-blue-200 text-slate-700 px-2.5 py-1 rounded-lg">{n}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 py-16 text-center text-white">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-center mb-4">
            <LogoPyme size={52} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">¿Listo para empezar?</h2>
          <p className="text-blue-100 text-base mb-6">
            Creá tu empresa simulada en menos de 2 minutos y empezá a practicar gestión empresarial real.
          </p>
          <Link href="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl text-base hover:bg-blue-50 transition-colors shadow-md">
            Crear mi empresa →
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0f172a] text-slate-500 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <LogoPyme size={24} />
            <span className="text-slate-400 font-medium">PYME 360</span>
            <span>· Simulación educativa · datos ficticios</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/credits" className="hover:text-slate-300 transition-colors">Créditos y T&C</Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors">Ingresar</Link>
            <span>Juan Manuel Gómez · Misiones · 2026</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
