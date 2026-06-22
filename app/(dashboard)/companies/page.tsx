import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/cn'
import { CopyTokenCard } from './CopyTokenCard'

const SECTOR_LABELS: Record<string, { label: string; icon: string }> = {
  comercial:    { label: 'PyME Comercial',  icon: '🏪' },
  construccion: { label: 'Construcción',    icon: '🏗️' },
  salud:        { label: 'Salud',           icon: '🏥' },
  gastronomia:  { label: 'Gastronomía',     icon: '🍽️' },
  transporte:   { label: 'Transporte',      icon: '🚚' },
}

const IIBB_LABELS: Record<number, string> = {
  0.03:  'Misiones / Bs. As. / CABA — 3%',
  0.035: 'Córdoba — 3.5%',
  0.02:  'Actividad reducida — 2%',
  0.015: 'Actividad reducida — 1.5%',
  0:     'Exento',
}

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!company) redirect('/companies/new')

  const [
    { count: salesCount },
    { count: purchasesCount },
    { count: accountsCount },
    { data: cashAccounts },
    { data: recentSales },
  ] = await Promise.all([
    supabase.from('sales').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
    supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
    supabase.from('chart_of_accounts').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
    supabase.from('cash_accounts').select('name, type, balance').eq('company_id', company.id).order('type'),
    supabase.from('sales').select('total, date').eq('company_id', company.id).order('date', { ascending: false }).limit(3),
  ])

  const totalCash = (cashAccounts ?? []).reduce((s, a) => s + Number(a.balance), 0)
  const sector = SECTOR_LABELS[company.sector] ?? { label: company.sector, icon: '🏢' }
  const iibbLabel = IIBB_LABELS[Number(company.iibb_rate)] ?? `${(Number(company.iibb_rate) * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-y-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mi Empresa</h1>
          <p className="text-slate-500 text-sm mt-0.5">Datos y configuración de tu empresa simulada.</p>
        </div>
        <Link href="/companies/new">
          <Button variant="outline" size="sm">+ Crear nueva empresa</Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {sector.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800">{company.name}</h2>
                <Badge variant="info">{sector.label}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-slate-600">
                <div><span className="text-slate-400 text-xs">CUIT</span><br />{company.cuit}</div>
                <div><span className="text-slate-400 text-xs">Desde</span><br />{formatDate(company.sim_start_date ?? company.created_at)}</div>
                <div><span className="text-slate-400 text-xs">Domicilio</span><br />{company.address || '—'}</div>
                <div><span className="text-slate-400 text-xs">Domicilio fiscal</span><br />Misiones, Argentina</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Caja y Bancos</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalCash)}</p>
          <p className="text-xs text-slate-400 mt-1">{(cashAccounts ?? []).length} cuenta{(cashAccounts ?? []).length !== 1 ? 's' : ''}</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Ventas</p>
          <p className="text-2xl font-bold text-slate-800">{salesCount ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">operaciones registradas</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Compras</p>
          <p className="text-2xl font-bold text-slate-800">{purchasesCount ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">operaciones registradas</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Plan de cuentas</p>
          <p className="text-2xl font-bold text-slate-800">{accountsCount ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">cuentas contables</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Datos fiscales</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">CUIT simulado</span>
                <span className="text-sm font-medium text-slate-800">{company.cuit}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Condición IVA</span>
                <span className="text-sm font-medium text-slate-800">Responsable Inscripto</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Provincia (IIBB)</span>
                <span className="text-sm font-medium text-slate-800">Misiones</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Alícuota IIBB</span>
                <Badge variant="info">{iibbLabel}</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">IIBB — Organismo</span>
                <span className="text-sm text-slate-800">DGR Misiones</span>
              </div>
            </div>
            <div className="mt-4 bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-800">
              <strong>Pagos mensuales:</strong> IIBB se declara y paga antes del día 25 de cada mes ante la DGR Misiones.
              <Link href="/taxes" className="block mt-1 text-purple-600 hover:underline">Ver guía completa de impuestos</Link>
            </div>
            <CopyTokenCard token={(company as any).sync_token ?? null} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Cuentas de tesorería</h3>
              <Link href="/treasury" className="text-xs text-blue-600 hover:underline">Ver movimientos</Link>
            </div>
            {(cashAccounts ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No hay cuentas registradas.</p>
            ) : (
              <div className="space-y-2">
                {(cashAccounts ?? []).map((acc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{acc.type === 'banco' ? '🏦' : '💵'}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{acc.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{acc.type}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(Number(acc.balance))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 mt-1">
                  <span className="text-sm font-semibold text-blue-800">Total disponible</span>
                  <span className="text-sm font-bold text-blue-800">{formatCurrency(totalCash)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Últimas ventas</h3>
              <Link href="/sales" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
            </div>
            {(recentSales ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Aún no hay ventas.</p>
            ) : (
              <div className="space-y-2">
                {(recentSales ?? []).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-600">{formatDate(s.date)}</span>
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(s.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Accesos rápidos</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/accounting',  icon: '📒', label: 'Contabilidad' },
                { href: '/taxes',       icon: '🧾', label: 'Impuestos'    },
                { href: '/reports',     icon: '📈', label: 'Reportes'     },
                { href: '/inventory',   icon: '📋', label: 'Inventario'   },
              ].map((a) => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-colors">
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{a.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
