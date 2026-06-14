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

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(name)')
    .eq('company_id', company.id)
    .order('date', { ascending: false })

  const total = (purchases ?? []).reduce((s: number, p: any) => s + Number(p.total), 0)
  const pending = (purchases ?? []).filter((p: any) => p.status === 'pendiente').reduce((s: number, p: any) => s + Number(p.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
          <p className="text-slate-500 text-sm mt-0.5">Registrá las compras de mercadería y servicios a proveedores.</p>
        </div>
        <Link href="/purchases/new"><Button>+ Nueva compra</Button></Link>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>Circuito de compra:</strong> Elegís el proveedor, los productos y el tipo de pago. Si pagás de contado, el dinero sale de caja/banco. Si es a cuenta corriente, queda registrada la deuda con el proveedor. En ambos casos, el stock aumenta automáticamente.
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total comprado</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(total)}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pendiente de pago</p><p className={`text-2xl font-bold ${pending > 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(pending)}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Operaciones</p><p className="text-2xl font-bold text-slate-800">{(purchases ?? []).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {!purchases || purchases.length === 0 ? (
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
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">{formatDate(p.date)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.supplier?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{p.transaction_type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(p.total))}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={p.status === 'pagado' ? 'success' : p.status === 'cancelado' ? 'danger' : 'warning'}>
                        {p.status}
                      </Badge>
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
