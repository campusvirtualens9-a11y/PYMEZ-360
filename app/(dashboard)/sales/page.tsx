import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/cn'

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!company) redirect('/companies/new')

  const [{ data: sales }, { data: journalRefs }] = await Promise.all([
    supabase
      .from('sales')
      .select('*, customer:customers(name), items:sale_items(id)')
      .eq('company_id', company.id)
      .order('date', { ascending: false }),
    supabase
      .from('journal_entries')
      .select('reference_id')
      .eq('company_id', company.id)
      .eq('reference_type', 'sale'),
  ])

  const accountedIds = new Set((journalRefs ?? []).map((j: any) => j.reference_id))
  const all        = sales ?? []
  const totalMonto = all.reduce((s: number, p: any) => s + Number(p.total), 0)
  const pending    = all.filter((p: any) => p.status === 'pendiente')
  const pendingAmt = pending.reduce((s: number, p: any) => s + Number(p.total), 0)
  const collected  = all.filter((p: any) => p.status === 'cobrado')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-y-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ventas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Registrá las ventas de productos y servicios a clientes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending.length > 0 && (
            <Link href="/collections"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-sm font-medium hover:bg-orange-100 transition-colors">
              💰 {pending.length} cobro{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''}
            </Link>
          )}
          <Link href="/sales/new"><Button>+ Nueva venta</Button></Link>
        </div>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg text-sm text-green-700">
        💡 <strong>Circuito de venta:</strong> Elegís el cliente, los productos y si cobrás de contado o a cuenta corriente. De contado, el dinero entra a caja/banco ahora. A crédito, generás una cuenta a cobrar. En ambos casos, el stock se descuenta automáticamente.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total vendido</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalMonto)}</p>
            <p className="text-xs text-slate-400 mt-1">{all.length} operaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pendiente de cobro</p>
            <p className={`text-2xl font-bold ${pendingAmt > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{formatCurrency(pendingAmt)}</p>
            <p className="text-xs text-slate-400 mt-1">{pending.length} ventas a crédito</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Cobradas</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(collected.reduce((s: number, p: any) => s + Number(p.total), 0))}</p>
            <p className="text-xs text-slate-400 mt-1">{collected.length} ventas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Ir a módulos</p>
            <div className="flex flex-col gap-1 mt-1">
              <Link href="/collections" className="text-xs text-orange-600 hover:underline font-medium">→ Cobros de clientes</Link>
              <Link href="/inventory" className="text-xs text-blue-600 hover:underline font-medium">→ Ver inventario</Link>
              <Link href="/customers" className="text-xs text-slate-500 hover:underline font-medium">→ Clientes</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {all.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-slate-500 text-sm">Aún no hay ventas registradas.</p>
              <Link href="/sales/new"><Button size="sm" className="mt-4">Registrar primera venta</Button></Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Total</th>
                  <th className="text-center px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                  <th className="text-center px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Contabilidad</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Acción</th>
                </tr>
              </thead>
              <tbody>
                {all.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">{formatDate(s.date)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{s.customer?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{s.transaction_type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(s.total))}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={s.status === 'cobrado' ? 'success' : s.status === 'cancelado' ? 'danger' : 'warning'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {accountedIds.has(s.id) ? (
                        <span className="text-xs text-green-600 font-medium">✓ Registrado</span>
                      ) : (
                        <span className="text-xs text-amber-500">Pendiente</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/sales/${s.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors font-medium">
                          Ver comprobante
                        </Link>
                        {s.status === 'pendiente' && (
                          <Link href="/collections"
                            className="text-xs font-medium text-orange-600 hover:text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">
                            Cobrar →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
