import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/cn'

export default async function PurchasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!company) redirect('/companies/new')

  const [{ data: purchases }, { data: journalRefs }] = await Promise.all([
    supabase
      .from('purchases')
      .select('*, supplier:suppliers(name, balance), items:purchase_items(id)')
      .eq('company_id', company.id)
      .order('date', { ascending: false }),
    supabase
      .from('journal_entries')
      .select('reference_id')
      .eq('company_id', company.id)
      .eq('reference_type', 'purchase'),
  ])

  const accountedIds = new Set((journalRefs ?? []).map((j: any) => j.reference_id))
  const all         = purchases ?? []
  const totalMonto  = all.reduce((s: number, p: any) => s + Number(p.total), 0)
  const pending     = all.filter((p: any) => p.status === 'pendiente')
  const pendingAmt  = pending.reduce((s: number, p: any) => s + Number(p.total), 0)
  const paid        = all.filter((p: any) => p.status === 'pagado')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
          <p className="text-slate-500 text-sm mt-0.5">Registrá las compras de mercadería y servicios a proveedores.</p>
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <Link href="/payments"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors">
              ⚠️ {pending.length} deuda{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''} → Ir a Pagos
            </Link>
          )}
          <Link href="/purchases/new"><Button>+ Nueva compra</Button></Link>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>Circuito de compra:</strong> Elegís el proveedor, los productos y el tipo de pago. Si pagás de contado, el dinero sale de caja/banco. Si es a cuenta corriente, queda registrada la deuda con el proveedor. En ambos casos, el stock aumenta automáticamente.
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total comprado</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalMonto)}</p>
            <p className="text-xs text-slate-400 mt-1">{all.length} operaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pendiente de pago</p>
            <p className={`text-2xl font-bold ${pendingAmt > 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(pendingAmt)}</p>
            <p className="text-xs text-slate-400 mt-1">{pending.length} compras a crédito</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pagadas</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paid.reduce((s: number, p: any) => s + Number(p.total), 0))}</p>
            <p className="text-xs text-slate-400 mt-1">{paid.length} compras</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Ir a módulos</p>
            <div className="flex flex-col gap-1 mt-1">
              <Link href="/payments" className="text-xs text-red-600 hover:underline font-medium">→ Pagos a proveedores</Link>
              <Link href="/inventory" className="text-xs text-blue-600 hover:underline font-medium">→ Ver inventario</Link>
              <Link href="/suppliers" className="text-xs text-slate-500 hover:underline font-medium">→ Proveedores</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {all.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-slate-500 text-sm">Aún no hay compras registradas.</p>
              <Link href="/purchases/new"><Button size="sm" className="mt-4">Registrar primera compra</Button></Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Proveedor</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Total</th>
                  <th className="text-center px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                  <th className="text-center px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Contabilidad</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Acción</th>
                </tr>
              </thead>
              <tbody>
                {all.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">{formatDate(p.date)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.supplier?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{p.transaction_type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(p.total))}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={p.status === 'pagado' ? 'success' : p.status === 'cancelado' ? 'danger' : 'warning'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {accountedIds.has(p.id) ? (
                        <span className="text-xs text-green-600 font-medium">✓ Registrado</span>
                      ) : (
                        <span className="text-xs text-amber-500">Pendiente</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/purchases/${p.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors font-medium">
                          Ver comprobante
                        </Link>
                        {p.status === 'pendiente' && (
                          <Link href="/payments"
                            className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                            Pagar →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
