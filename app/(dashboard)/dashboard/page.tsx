import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/cn'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Obtener empresa
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Obtener perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">¡Bienvenido a EduERP 360!</h2>
          <p className="text-slate-600 mb-6">
            Para comenzar, creá tu empresa simulada. Podés elegir el rubro y se cargarán
            datos de ejemplo para que empieces a practicar.
          </p>
          <Link href="/companies/new">
            <Button size="lg" className="w-full sm:w-auto">
              🏢 Crear mi empresa simulada
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const companyId = company.id
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Parallelizar todas las queries del dashboard
  const [
    { data: cashAccounts },
    { data: salesMonth },
    { data: purchasesMonth },
    { data: receivables },
    { data: payables },
    { data: lowStock },
    { data: recentSales },
    { data: recentPurchases },
    { data: challenges },
  ] = await Promise.all([
    supabase.from('cash_accounts').select('balance, type').eq('company_id', companyId),
    supabase.from('sales').select('total').eq('company_id', companyId).gte('date', monthStart),
    supabase.from('purchases').select('total').eq('company_id', companyId).gte('date', monthStart),
    supabase.from('receivables').select('pending_amount').eq('company_id', companyId).neq('status', 'cobrado'),
    supabase.from('payables').select('pending_amount').eq('company_id', companyId).neq('status', 'pagado'),
    supabase
      .from('products')
      .select('id, name, stock_current, stock_min')
      .eq('company_id', companyId)
      .limit(100),
    supabase.from('sales').select('id, date, total, customer_id, transaction_type, status').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
    supabase.from('purchases').select('id, date, total, supplier_id, transaction_type, status').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
    supabase.from('user_challenges').select('*, challenge:challenges(*)').eq('profile_id', user.id).eq('company_id', companyId).eq('completed', false).limit(5),
  ])

  const totalCash = (cashAccounts ?? []).reduce((s, a) => s + Number(a.balance), 0)
  const totalSales = (salesMonth ?? []).reduce((s, a) => s + Number(a.total), 0)
  const totalPurchases = (purchasesMonth ?? []).reduce((s, a) => s + Number(a.total), 0)
  const totalReceivables = (receivables ?? []).reduce((s, a) => s + Number(a.pending_amount), 0)
  const totalPayables = (payables ?? []).reduce((s, a) => s + Number(a.pending_amount), 0)

  const lowStockItems = (lowStock ?? []).filter(
    (p) => Number(p.stock_current) <= Number(p.stock_min)
  )

  const { count: totalChallenges } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })

  const { count: completedChallenges } = await supabase
    .from('user_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('company_id', companyId)
    .eq('completed', true)

  const progress = totalChallenges
    ? Math.round(((completedChallenges ?? 0) / totalChallenges) * 100)
    : 0

  const sectorLabels: Record<string, string> = {
    comercial: 'PyME Comercial', construccion: 'Construcción',
    salud: 'Salud', gastronomia: 'Gastronomía', transporte: 'Transporte',
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {sectorLabels[company.sector] ?? company.sector} · {company.cuit}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lowStockItems.length > 0 && (
            <Link href="/inventory">
              <Badge variant="warning" className="cursor-pointer">
                ⚠️ {lowStockItems.length} producto{lowStockItems.length !== 1 ? 's' : ''} con stock bajo
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Caja y Bancos"       value={totalCash}         icon="🏦" variant="info"    isCurrency />
        <StatCard title="Ventas del mes"      value={totalSales}        icon="💰" variant="success" isCurrency />
        <StatCard title="Compras del mes"     value={totalPurchases}    icon="🛒" variant="default" isCurrency />
        <StatCard title="Cuentas a cobrar"    value={totalReceivables}  icon="📥" variant={totalReceivables > 0 ? 'warning' : 'default'} isCurrency />
        <StatCard title="Cuentas a pagar"     value={totalPayables}     icon="📤" variant={totalPayables > 0 ? 'danger' : 'default'}  isCurrency />
        <StatCard title="Stock bajo"          value={lowStockItems.length} icon="📦" variant={lowStockItems.length > 0 ? 'warning' : 'success'} />
      </div>

      {/* Progreso y perfil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progreso general */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">Progreso de la empresa</span>
              <span className="text-lg font-bold text-blue-700">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {completedChallenges ?? 0} de {totalChallenges ?? 0} desafíos completados
            </p>
            {progress >= 80 && (
              <Link href="/exam">
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium text-center cursor-pointer hover:bg-green-100 transition-colors">
                  🎓 ¡Examen final desbloqueado! Ir a rendir →
                </div>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* XP y nivel */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow">
                {profile?.level ?? 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Nivel {profile?.level ?? 1}</p>
                <p className="text-xs text-slate-500">{profile?.xp ?? 0} XP acumulados</p>
                <p className="text-xs text-slate-500 mt-1">{profile?.full_name}</p>
              </div>
            </div>
            <Link href="/gamification" className="mt-4 block">
              <Button variant="outline" size="sm" className="w-full">
                Ver todos los desafíos →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-3">
            {[
              { href: '/purchases/new', icon: '🛒', label: 'Nueva compra' },
              { href: '/sales/new',     icon: '💰', label: 'Nueva venta'  },
              { href: '/collections',   icon: '📥', label: 'Cobrar'       },
              { href: '/payments',      icon: '📤', label: 'Pagar'        },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center gap-1 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-center transition-colors"
              >
                <span className="text-xl">{a.icon}</span>
                <span className="text-xs font-medium text-slate-700">{a.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Últimas operaciones y desafíos pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimas ventas */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas ventas</CardTitle>
            <Link href="/sales" className="text-xs text-blue-600 hover:underline">Ver todas →</Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentSales && recentSales.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-2 text-xs text-slate-400 font-medium">Fecha</th>
                    <th className="text-left px-5 py-2 text-xs text-slate-400 font-medium">Tipo</th>
                    <th className="text-right px-5 py-2 text-xs text-slate-400 font-medium">Total</th>
                    <th className="text-right px-5 py-2 text-xs text-slate-400 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-2.5 text-slate-600">{formatDate(s.date)}</td>
                      <td className="px-5 py-2.5 text-slate-600 capitalize">{s.transaction_type}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-slate-800">{formatCurrency(s.total)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <Badge variant={s.status === 'cobrado' ? 'success' : s.status === 'cancelado' ? 'danger' : 'warning'}>
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                Aún no hay ventas registradas.{' '}
                <Link href="/sales/new" className="text-blue-600 hover:underline">Crear primera venta</Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desafíos pendientes */}
        <Card>
          <CardHeader>
            <CardTitle>Desafíos pendientes</CardTitle>
            <Link href="/gamification" className="text-xs text-blue-600 hover:underline">Ver todos →</Link>
          </CardHeader>
          <CardContent>
            {challenges && challenges.length > 0 ? (
              <div className="space-y-3">
                {challenges.map((uc: any) => (
                  <div key={uc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">🎯</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{uc.challenge?.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, ((uc.progress ?? 0) / (uc.challenge?.required_count ?? 1)) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {uc.progress ?? 0}/{uc.challenge?.required_count ?? 1}
                        </span>
                      </div>
                    </div>
                    <Badge variant="info">{uc.challenge?.xp_reward} XP</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-sm">
                🎉 ¡No tenés desafíos pendientes! Seguí explorando la app.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock bajo */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="bg-yellow-50">
            <CardTitle className="text-yellow-800">⚠️ Productos con stock bajo</CardTitle>
            <Link href="/inventory" className="text-xs text-yellow-700 hover:underline">Ver inventario →</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
              {lowStockItems.slice(0, 8).map((p) => (
                <div key={p.id} className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                  <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                  <p className="text-lg font-bold text-yellow-700 mt-1">{p.stock_current}</p>
                  <p className="text-xs text-slate-500">Mín: {p.stock_min}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
