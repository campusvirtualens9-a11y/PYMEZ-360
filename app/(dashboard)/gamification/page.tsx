import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { xpForNextLevel } from '@/lib/gamification/xp'
import { formatDate } from '@/utils/cn'

export default async function GamificationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [{ data: allChallenges }, { data: userChallenges }, { data: xpHistory }] = await Promise.all([
    supabase.from('challenges').select('*').order('module').order('xp_reward'),
    company
      ? supabase.from('user_challenges').select('*, challenge:challenges(*)').eq('profile_id', user.id).eq('company_id', company.id)
      : Promise.resolve({ data: [] }),
    supabase.from('xp_events').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(10),
  ])

  const challengeMap = new Map((userChallenges ?? []).map((uc: any) => [uc.challenge_id, uc]))
  const completedCount = (userChallenges ?? []).filter((uc: any) => uc.completed).length
  const totalCount = (allChallenges ?? []).length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const { needed, progress: levelProgress } = xpForNextLevel(profile?.xp ?? 0)

  const moduleLabels: Record<string, string> = {
    customers: '👥 Clientes', suppliers: '🏭 Proveedores', products: '📦 Productos',
    purchases: '🛒 Compras', sales: '💰 Ventas', collections: '📥 Cobros',
    payments: '📤 Pagos', inventory: '📋 Inventario', accounting: '📒 Contabilidad', general: '🌟 General',
  }

  const grouped = (allChallenges ?? []).reduce((acc: Record<string, any[]>, c: any) => {
    acc[c.module] = acc[c.module] ?? []
    acc[c.module].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Desafíos y Logros</h1>
        <p className="text-slate-500 text-sm mt-0.5">Completá desafíos, ganás XP y subís de nivel.</p>
      </div>

      {/* Perfil del jugador */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                {profile?.level ?? 1}
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-slate-800">{profile?.full_name}</p>
                <p className="text-slate-500 text-sm">Nivel {profile?.level} · {profile?.xp ?? 0} XP total</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso al nivel {(profile?.level ?? 1) + 1}</span>
                    <span>{needed} XP restantes</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="font-semibold text-slate-700 mb-3">Progreso empresa</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-700">{progress}%</div>
              <p className="text-xs text-slate-500 mt-1">{completedCount} de {totalCount} desafíos</p>
              <div className="w-full bg-slate-200 rounded-full h-3 mt-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              {progress >= 80 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
                  🎓 Examen final desbloqueado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de XP */}
      {xpHistory && xpHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimos XP ganados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {xpHistory.map((e: any) => (
                  <tr key={e.id} className="border-b border-slate-50 px-5 py-2">
                    <td className="px-5 py-2 text-slate-600">{formatDate(e.created_at)}</td>
                    <td className="px-5 py-2 text-slate-800">{e.reason}</td>
                    <td className="px-5 py-2 text-right font-bold text-green-600">+{e.amount} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Desafíos por módulo */}
      {Object.entries(grouped).map(([module, challenges]: [string, any[]]) => (
        <Card key={module}>
          <CardHeader>
            <CardTitle>{moduleLabels[module] ?? module}</CardTitle>
            <Badge variant="info">
              {challenges.filter((c) => challengeMap.get(c.id)?.completed).length}/{challenges.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {challenges.map((c: any) => {
                const uc = challengeMap.get(c.id)
                const completed = uc?.completed ?? false
                const progressVal = uc?.progress ?? 0
                const pct = Math.min(100, Math.round((progressVal / c.required_count) * 100))

                return (
                  <div
                    key={c.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      completed ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                      completed ? 'bg-green-500 text-white' : 'bg-white border border-slate-200'
                    }`}>
                      {completed ? '✓' : '🎯'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${completed ? 'text-green-800' : 'text-slate-800'}`}>
                        {c.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                      {!completed && c.required_count > 1 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Progreso</span>
                            <span>{progressVal}/{c.required_count}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                      {completed && uc?.completed_at && (
                        <p className="text-xs text-green-600 mt-1">Completado: {formatDate(uc.completed_at)}</p>
                      )}
                    </div>
                    <Badge variant={completed ? 'success' : 'info'} className="flex-shrink-0">
                      {c.xp_reward} XP
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
