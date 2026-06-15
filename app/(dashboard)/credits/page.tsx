import Link from 'next/link'
import { LogoPymeLarge } from '@/components/ui/LogoPyme'

export default function CreditsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-12">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <LogoPymeLarge />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">PYME 360</h1>
          <p className="text-slate-500 mt-1">Plataforma educativa de gestión empresarial para PyMEs argentinas</p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 font-medium">
          Versión 1.0 · 2026 · Argentina
        </div>
      </div>

      {/* ── Créditos ──────────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-white font-bold text-lg">Créditos</h2>
        </div>
        <div className="p-6 space-y-6">

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md">
              JG
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">Juan Manuel Gómez</p>
              <p className="text-slate-500 text-sm">Diseño, desarrollo y contenido educativo</p>
              <a href="mailto:gomezjuanmanuel.1436@gmail.com"
                className="text-blue-600 hover:underline text-sm mt-1 inline-block">
                gomezjuanmanuel.1436@gmail.com
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tecnologías utilizadas</p>
              <div className="flex flex-wrap gap-2">
                {['Next.js 15', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Vercel'].map(t => (
                  <span key={t} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ecosistema educativo</p>
              <div className="space-y-1">
                <a href="https://tributar2026nuevo.vercel.app/dashboard" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-600 hover:underline">
                  <span>🏛️</span> Tribut.ar — Simulador ARCA/AFIP
                </a>
                <a href="https://sueldos360.vercel.app/dashboard" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-teal-600 hover:underline">
                  <span>👷</span> Sueldos 360 — Liquidación de haberes
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Marco normativo de referencia</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">Ley 19.550 (Sociedades)</span>
              <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">RT 9/17 FACPCE (Contabilidad)</span>
              <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">AFIP / ARCA</span>
              <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">DGR Misiones</span>
              <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">Ley 20.744 (LCT)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Términos y Condiciones ─────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
          <h2 className="text-white font-bold text-lg">Bases y Condiciones de Uso</h2>
        </div>
        <div className="p-6 space-y-5 text-sm text-slate-600 leading-relaxed">

          <article>
            <h3 className="font-semibold text-slate-800 mb-1">1. Naturaleza de la plataforma</h3>
            <p>
              PYME 360 es una <strong>aplicación educativa de simulación</strong> diseñada para fines de aprendizaje
              en el área de administración, contabilidad y gestión de empresas. No constituye un sistema contable
              certificado ni homologado por ningún organismo oficial argentino.
            </p>
          </article>

          <article>
            <h3 className="font-semibold text-slate-800 mb-1">2. Datos ficticios</h3>
            <p>
              Todos los datos, transacciones, montos, CUITs, razones sociales, productos y reportes generados dentro
              de la plataforma son <strong>estrictamente ficticios y de carácter educativo</strong>. No deben ser
              utilizados para declaraciones impositivas, presentaciones legales ni ningún fin comercial real.
            </p>
          </article>

          <article>
            <h3 className="font-semibold text-slate-800 mb-1">3. Sin asesoramiento profesional</h3>
            <p>
              La información presentada sobre impuestos (IVA, Ganancias, IIBB, Monotributo), contabilidad y laboral
              es orientativa y puede no reflejar la normativa vigente actualizada. <strong>No reemplaza el
              asesoramiento de un contador público matriculado</strong>. Para situaciones reales, consultá siempre
              a un profesional habilitado.
            </p>
          </article>

          <article>
            <h3 className="font-semibold text-slate-800 mb-1">4. Propiedad intelectual</h3>
            <p>
              El diseño, código fuente, textos educativos y recursos visuales de PYME 360 son propiedad de
              Juan Manuel Gómez. Queda prohibida su reproducción total o parcial con fines comerciales sin
              autorización expresa del autor.
            </p>
          </article>

          <article>
            <h3 className="font-semibold text-slate-800 mb-1">5. Privacidad</h3>
            <p>
              Los datos ingresados por el usuario (nombre de empresa, operaciones, contactos) se almacenan de
              forma segura en Supabase bajo el principio de aislamiento por usuario (Row Level Security).
              No se comparten con terceros ni se utilizan con fines publicitarios.
            </p>
          </article>

          <article>
            <h3 className="font-semibold text-slate-800 mb-1">6. Limitación de responsabilidad</h3>
            <p>
              El autor no se responsabiliza por decisiones económicas, contables o impositivas tomadas con base
              en la información o simulaciones de esta plataforma. El uso es bajo exclusiva responsabilidad del usuario.
            </p>
          </article>

          <article>
            <h3 className="font-semibold text-slate-800 mb-1">7. Modificaciones</h3>
            <p>
              El autor se reserva el derecho de modificar estas condiciones y la plataforma en cualquier momento.
              El uso continuado de la aplicación implica la aceptación de los cambios.
            </p>
          </article>

          <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
            Última actualización: junio 2026 · Posadas, Misiones, Argentina
          </div>
        </div>
      </section>

      {/* ── Links ─────────────────────────────────────────────────────── */}
      <div className="text-center">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
