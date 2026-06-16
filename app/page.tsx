import Link from 'next/link'
import { LogoPyme } from '@/components/ui/LogoPyme'
import {
  CheckCircle, Zap, Link2, GraduationCap, BarChart3,
  ArrowRight, BookOpen, Users, Building2, Briefcase,
} from 'lucide-react'

/* ─── Data ───────────────────────────────────────────────────────────────── */

const MODULES = [
  { icon: '🏢', title: 'Mi Empresa',     desc: 'Configurá nombre, rubro, CUIT, condición fiscal y saldos iniciales con asiento de apertura.' },
  { icon: '👥', title: 'Clientes',       desc: 'Alta con CUIT, condición IVA y cuenta corriente. Historial de ventas y saldo pendiente.' },
  { icon: '🏭', title: 'Proveedores',    desc: 'Gestión completa con historial de compras, saldos y datos fiscales.' },
  { icon: '📦', title: 'Productos',      desc: 'Catálogo con stock, costo, precio de venta, unidad de medida e IVA por artículo.' },
  { icon: '🛒', title: 'Compras',        desc: 'Facturas A / B / C con tipo de comprobante AFIP. Actualiza stock, cuentas y contabilidad.' },
  { icon: '💰', title: 'Ventas',         desc: 'Comprobantes con numeración automática, validaciones fiscales y circuito completo.' },
  { icon: '📥', title: 'Cobros',         desc: 'Cobranzas imputadas a facturas. Actualiza cuenta corriente del cliente y caja/banco.' },
  { icon: '📤', title: 'Pagos',          desc: 'Pagos a proveedores en efectivo, transferencia o cheque. Exportación de recibo.' },
  { icon: '🏦', title: 'Tesorería',      desc: 'Cajas y cuentas bancarias con movimientos en tiempo real. Chequeras y transferencias.' },
  { icon: '📋', title: 'Inventario',     desc: 'Control de stock con alertas de quiebre, kardex y valorización al costo.' },
  { icon: '📒', title: 'Contabilidad',   desc: 'Asientos automáticos por operación. Plan de cuentas RT 9/17, libro diario y balance.' },
  { icon: '🧾', title: 'Impuestos',      desc: 'IVA discriminado / no discriminado, Ingresos Brutos provincial. Integra con Tribut.ar.' },
  { icon: '📈', title: 'Reportes',       desc: 'Estado de resultados, flujo de fondos y tablero de indicadores de gestión.' },
  { icon: '🎮', title: 'Desafíos',       desc: 'Puntos XP, logros desbloqueables y progreso gamificado para sostener la motivación.' },
  { icon: '🎓', title: 'Examen Final',   desc: 'Evaluación integral del ciclo completo: operaciones, contabilidad e impuestos.' },
]

const STEPS = [
  {
    num: '1',
    icon: '✉️',
    title: 'Creá tu cuenta',
    desc: 'Solo un email y una contraseña. Sin costo, sin tarjeta, en menos de un minuto.',
  },
  {
    num: '2',
    icon: '🏢',
    title: 'Configurá tu empresa',
    desc: 'Elegí el nombre, el rubro y los saldos iniciales. Tu PyME virtual queda lista al instante.',
  },
  {
    num: '3',
    icon: '🚀',
    title: 'Practicá el ciclo real',
    desc: 'Comprá, vendé, cobrá, liquidá impuestos y cerrá balances, exactamente como en la realidad.',
  },
]

const DIFERENCIADORES = [
  {
    Icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Contexto 100 % argentino',
    desc: 'Facturas A/B/C, IVA 21 %, Ingresos Brutos, AFIP/ARCA, plan de cuentas RT 9/17 FACPCE y Ley 20.744 LCT. Sin adaptaciones genéricas.',
  },
  {
    Icon: Link2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'Todo integrado, sin silos',
    desc: 'Cada operación impacta automáticamente en Contabilidad, Tesorería e Inventario — igual que en un ERP real de empresa.',
  },
  {
    Icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Aprendizaje gamificado',
    desc: 'Puntos XP, desafíos por módulo y logros desbloqueables que sostienen la motivación a lo largo de todo el curso.',
  },
  {
    Icon: GraduationCap,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Diseñado para el aula',
    desc: 'Los docentes pueden asignar la plataforma como trabajo práctico integrador y los estudiantes avanzan a su propio ritmo.',
  },
]

const PUBLICOS = [
  { Icon: BookOpen,    color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Estudiantes de Administración y Contabilidad' },
  { Icon: Users,       color: 'text-violet-600', bg: 'bg-violet-50', label: 'Docentes que necesitan casos prácticos reales' },
  { Icon: Zap,         color: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Emprendedores que quieren aprender a gestionar' },
  { Icon: Briefcase,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'Instituciones con programas de formación empresarial' },
]

const ECOSYSTEM = [
  {
    href:    'https://tributar2026nuevo.vercel.app/dashboard',
    icon:    '🏛️',
    name:    'Tribut.ar',
    tagline: 'Simulador ARCA / AFIP',
    desc:    'Practicá la presentación de DDJJ de IVA, Ganancias y Monotributo ante el organismo fiscal argentino.',
    chips:   ['IVA F.731', 'Ganancias', 'Monotributo', 'DDJJ'],
    gradient: 'from-purple-600 to-violet-700',
    btn:     'bg-purple-600 hover:bg-purple-700',
  },
  {
    href:    'https://sueldos360.vercel.app/dashboard',
    icon:    '👷',
    name:    'Sueldos 360',
    tagline: 'Liquidación de haberes',
    desc:    'Liquidá sueldos y jornales con recibos, SAC, vacaciones y aportes patronales según la LCT.',
    chips:   ['Recibos', 'SAC', 'Vacaciones', 'Aportes'],
    gradient: 'from-teal-600 to-emerald-700',
    btn:     'bg-teal-600 hover:bg-teal-700',
  },
]

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoPyme size={34} />
            <div className="leading-none">
              <span className="font-extrabold text-slate-900 text-base tracking-tight">PYME 360</span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wide">Gestión educativa</span>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/auth/login"
              className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Ingresar
            </Link>
            <Link href="/auth/register"
              className="text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5">
              Registrarse gratis
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#1e3a8a]">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-900/30 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-200 text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Plataforma educativa · Argentina · 2026
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            La forma más real de aprender<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              gestión de una PyME
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Simulá el ciclo completo de una empresa argentina: compras, ventas, cobros, pagos,
            inventario, contabilidad, impuestos y más — todo integrado, sin datos reales, sin riesgo.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-blue-900/50 hover:shadow-blue-800/50 hover:-translate-y-0.5">
              Crear mi empresa gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-base border border-white/20 transition-all">
              Ya tengo cuenta → Ingresar
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-400 text-sm">
            {['Sin costo', 'Sin tarjeta de crédito', 'Datos 100 % ficticios y seguros', '15 módulos incluidos'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── STATS BAR ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-2xl overflow-hidden shadow-xl shadow-slate-200">
          {[
            { num: '15',    label: 'Módulos integrados' },
            { num: '100 %', label: 'Contexto argentino' },
            { num: '0 $',   label: 'Costo para el alumno' },
            { num: '360°',  label: 'Visión de la empresa' },
          ].map(({ num, label }) => (
            <div key={label} className="bg-white px-6 py-5 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-700">{num}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PARA QUIÉN ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-4">
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
          Ideal para
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PUBLICOS.map(({ Icon, color, bg, label }) => (
            <div key={label}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:border-slate-200 hover:shadow-sm transition-all text-center">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <p className="text-xs font-semibold text-slate-700 leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── POR QUÉ PYME 360 ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            No es un simulador más
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            PYME 360 replica la operatoria real de una empresa argentina con precisión normativa y pedagógica.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {DIFERENCIADORES.map(({ Icon, color, bg, title, desc }) => (
            <div key={title}
              className="flex gap-4 p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all group">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              Empezás en 3 pasos
            </h2>
            <p className="text-slate-500 text-base">Sin instalaciones, sin configuración técnica.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
            {STEPS.map(({ num, icon, title, desc }) => (
              <div key={num} className="flex flex-col items-center text-center relative">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-blue-200 shadow-sm flex flex-col items-center justify-center mb-5 relative">
                  <span className="text-2xl">{icon}</span>
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center shadow">
                    {num}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-colors shadow-sm">
              Empezar ahora — es gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── MÓDULOS ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            El ciclo administrativo completo
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            15 módulos interconectados que cubren cada área de gestión de una PyME argentina.
            Cada operación genera sus efectos en todos los módulos relacionados.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map(({ icon, title, desc }) => (
            <div key={title}
              className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 hover:border-blue-300 hover:shadow-sm transition-all group cursor-default">
              <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PARA DOCENTES ── */}
      <section className="bg-gradient-to-br from-blue-700 to-indigo-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-blue-100 text-xs font-semibold uppercase tracking-wide mb-6">
                <GraduationCap className="w-3.5 h-3.5" />
                Para docentes e instituciones
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">
                El trabajo práctico integrador que siempre quisiste tener
              </h2>
              <p className="text-blue-100 text-base leading-relaxed mb-8">
                PYME 360 reemplaza los ejercicios en papel con una simulación real.
                Tus estudiantes toman decisiones, ven las consecuencias en tiempo real
                y aprenden haciendo — exactamente como en una empresa.
              </p>
              <div className="space-y-3">
                {[
                  'Cada alumno tiene su propia empresa simulada',
                  'Los módulos pueden asignarse secuencialmente por unidad',
                  'El sistema de XP permite evaluar el avance de cada estudiante',
                  'Incluye examen final evaluable con escenario real',
                  'Sin instalaciones: funciona 100 % en el navegador',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-100 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📊', value: '15', label: 'módulos pedagógicos' },
                { icon: '🎮', value: 'XP',  label: 'sistema de puntos y logros' },
                { icon: '🎓', value: '1',   label: 'examen final integrado' },
                { icon: '🌐', value: '0',   label: 'instalaciones requeridas' },
              ].map(({ icon, value, label }) => (
                <div key={label} className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
                  <div className="text-2xl mb-2">{icon}</div>
                  <p className="text-2xl font-extrabold text-white">{value}</p>
                  <p className="text-xs text-blue-200 font-medium mt-0.5 leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ECOSISTEMA ── */}
      <section className="bg-[#0f172a] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Ecosistema educativo</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Conectado con todo el sistema
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              PYME 360 se integra con plataformas especializadas para cubrir cada área de formación empresarial.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {ECOSYSTEM.map(app => (
              <div key={app.name}
                className={`rounded-2xl p-7 bg-gradient-to-br ${app.gradient} text-white shadow-2xl`}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-4xl">{app.icon}</span>
                  <div>
                    <p className="font-extrabold text-xl leading-tight">{app.name}</p>
                    <p className="text-sm opacity-80 font-medium">{app.tagline}</p>
                  </div>
                </div>
                <p className="text-sm opacity-90 leading-relaxed mb-5">{app.desc}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {app.chips.map(c => (
                    <span key={c} className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">{c}</span>
                  ))}
                </div>
                <a href={app.href} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 ${app.btn} rounded-xl transition-colors shadow`}>
                  Abrir {app.name}
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARCO NORMATIVO ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row items-start gap-8">
            <div className="text-5xl flex-shrink-0">⚖️</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Marco normativo</p>
              <h3 className="font-extrabold text-white text-xl sm:text-2xl mb-4 leading-snug">
                Adaptado a la legislación argentina vigente
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Cada flujo — desde la emisión de comprobantes hasta la liquidación de impuestos —
                respeta la normativa actual. No es una simulación genérica: es la práctica real
                del contexto regulatorio argentino.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Ley 19.550 (Soc. Comerciales)',
                  'RT 9 / 17 FACPCE',
                  'AFIP / ARCA',
                  'RG 1415 — Comprobantes',
                  'IVA Ley 23.349',
                  'Ingresos Brutos DGR',
                  'Ley 20.744 LCT',
                  'Código Civil y Comercial',
                ].map(n => (
                  <span key={n}
                    className="text-xs bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 rounded-lg font-medium">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 rounded-2xl mb-6">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            ¿Listo para gestionar tu primera PyME?
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Creá tu empresa simulada en menos de 2 minutos y empezá a practicar gestión
            empresarial con todas las herramientas de un ERP real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-700 font-extrabold rounded-xl text-base hover:bg-blue-50 transition-all shadow-lg shadow-blue-900/30 hover:-translate-y-0.5">
              Crear mi empresa — es gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl text-base border border-white/25 transition-all">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-6 text-blue-300 text-xs">
            Sin costo · Sin tarjeta · Datos ficticios y seguros · 100 % en el navegador
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0a0f1e] text-slate-500 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <LogoPyme size={26} />
            <div className="leading-tight">
              <span className="text-slate-300 font-bold text-sm">PYME 360</span>
              <span className="block text-slate-600">Simulación educativa · datos ficticios</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-500">
            <Link href="/credits" className="hover:text-slate-300 transition-colors">Créditos y T&C</Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors">Ingresar</Link>
            <Link href="/auth/register" className="hover:text-slate-300 transition-colors">Registrarse</Link>
            <span className="text-slate-700">·</span>
            <span>Juan Manuel Gómez · Misiones · 2026</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
