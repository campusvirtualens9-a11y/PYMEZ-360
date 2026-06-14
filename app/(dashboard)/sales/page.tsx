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

  const { data: sales } = await supabase
    .from('sales')
    .select('*, customer:customers(name)')
    .eq('company_id', company.id)
    .order('date', { ascending: false })

  const total = (sales ?? []).reduce((s: number, p: any) => s + Number(p.total), 0)
  const pending = (sales ?? []).filter((p: any) => p.status === 'pendiente').reduce((s: number, p: any) => s + Number(p.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ventas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Registrá las ventas de productos y servicios a clientes.</p>
        </div>
        <Link href="/sales/new"><Button>+ Nueva venta</Button></Link>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg text-sm text-green-700">
        💡 <strong>Circuito de venta:</strong> Elegís el cliente, los productos y si cobrás de contado o a cuenta corriente. De contado, el dinero entra a caja/banco ahora. A crédito, generás una cuenta a cobrar. En ambos casos, el stock se descuenta automáticamente.
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total vendido</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(total)}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pendiente de cobro</p><p className={`text-2xl font-bold ${pending > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{formatCurrency(pending)}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Operaciones</p><p className="text-2xl font-bold text-slate-800">{(sales ?? []).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {!sales || sales.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-slate-500 text-sm">Aún no hay ventas registradas.</p>
              <Link href="/sales/new"><Button size="sm" className="mt-4">Registrar primera venta</Button></Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Total</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">{formatDate(s.date)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{s.customer?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{s.transaction_type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(s.total))}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={s.status === 'cobrado' ? 'success' : s.status === 'cancelado' ? 'danger' : 'warning'}>
                        {s.status}
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
