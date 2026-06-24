import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function ExamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id, microemprendimiento_mode').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()

  const isMicro = (company as any)?.microemprendimiento_mode ?? false
  const MICRO_BLOCKED_MODULES = ['accounting', 'taxes']

  let progress = 0
  if (company) {
    const [{ data: allChallenges }, { data: completedRows }] = await Promise.all([
      supabase.from('challenges').select('id, module'),
      supabase.from('user_challenges').select('challenge_id')
        .eq('profile_id', user.id).eq('company_id', company.id).eq('completed', true),
    ])
    const visibleIds = new Set(
      (allChallenges ?? [])
        .filter((c: any) => !isMicro || !MICRO_BLOCKED_MODULES.includes(c.module))
        .map((c: any) => c.id)
    )
    const completedVisible = (completedRows ?? []).filter((r: any) => visibleIds.has(r.challenge_id)).length
    progress = visibleIds.size > 0 ? Math.round((completedVisible / visibleIds.size) * 100) : 0
  }

  const unlocked = progress >= 80

  if (!unlocked) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Examen Final</h1>
          <p className="text-slate-500 text-sm mt-0.5">Evaluación integradora de todos los módulos.</p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Examen bloqueado</h2>
            <p className="text-slate-500 text-sm mb-4 max-w-md mx-auto">
              Para rendir el examen final necesitás completar al menos el <strong>80% de los desafíos</strong>.
              Actualmente llevás un <strong>{progress}%</strong> de progreso.
            </p>
            <div className="w-64 mx-auto bg-slate-200 rounded-full h-4 mb-4">
              <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-slate-500 mb-6">Te falta {80 - progress}% más para desbloquear el examen.</p>
            <Link href="/gamification">
              <Button>Ver desafíos pendientes →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🎓 Examen Final</h1>
        <p className="text-slate-500 text-sm mt-0.5">Evaluación integradora — Gestión Administrativa de PyMEs.</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
        ✅ <strong>¡Examen desbloqueado!</strong> Completaste el {progress}% de los desafíos. Estás listo para rendir.
      </div>

      <Card>
        <CardContent className="space-y-6 py-6">
          <div className="text-center">
            <div className="text-5xl mb-3">📝</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Evaluación Integradora</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              {isMicro
                ? 'El examen evalúa tu comprensión de los circuitos de un microemprendimiento: compras, ventas, cobros, pagos, inventario y tesorería.'
                : 'El examen evalúa tu comprensión de los circuitos administrativos: compras, ventas, cobros, pagos, inventario y contabilidad integrada.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl"><p className="font-medium text-slate-700">Tipo</p><p className="text-slate-500">Opción múltiple + casos</p></div>
            <div className="p-3 bg-slate-50 rounded-xl"><p className="font-medium text-slate-700">Duración</p><p className="text-slate-500">Sin límite de tiempo</p></div>
            <div className="p-3 bg-slate-50 rounded-xl"><p className="font-medium text-slate-700">Nota mínima</p><p className="text-slate-500">60 puntos para aprobar</p></div>
            <div className="p-3 bg-slate-50 rounded-xl"><p className="font-medium text-slate-700">Intentos</p><p className="text-slate-500">Ilimitados</p></div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl text-sm text-blue-700">
            <p className="font-semibold mb-2">Caso práctico de ejemplo:</p>
            {isMicro ? (
              <p>
                &ldquo;Tu emprendimiento compró mercaderías por $50.000 y las vendió de contado por $80.000.
                Pagaste parcialmente al proveedor $20.000 en efectivo. Indicá:
                a) qué impacto tiene cada operación en tu stock e inventario, b) cómo afecta el saldo de caja y proveedores,
                y c) cómo registrás el cobro de la venta en el módulo de tesorería.&rdquo;
              </p>
            ) : (
              <p>
                &ldquo;La empresa compró mercaderías a crédito por $50.000, luego vendió parte de ellas de contado por $80.000 y pagó parcialmente al proveedor $20.000 en efectivo. Indicá:
                a) qué módulos se ven afectados, b) qué impactos se producen en stock, caja, proveedores y contabilidad, y
                c) qué asientos contables corresponde registrar.&rdquo;
              </p>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-500 mb-4">
              {isMicro
                ? 'El examen interactivo completo estará disponible próximamente. Por ahora podés revisar tus ventas y tesorería.'
                : 'El examen interactivo completo estará disponible próximamente. Por ahora podés revisar tus asientos contables y balances.'}
            </p>
            <div className="flex gap-3 justify-center">
              {isMicro
                ? <Link href="/treasury"><Button variant="outline">Ver tesorería</Button></Link>
                : <Link href="/accounting"><Button variant="outline">Ver contabilidad</Button></Link>}
              <Link href="/gamification"><Button>Ver mis logros</Button></Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
