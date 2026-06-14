import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/utils/cn'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('*').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!company) redirect('/companies/new')

  const [{ data: sales }, { data: purchases }, { data: receivables }, { data: payables }, { data: products }] = await Promise.all([
    supabase.from('sales').select('total, date, transaction_type, status').eq('company_id', company.id),
    supabase.from('purchases').select('total, date, transaction_type, status').eq('company_id', company.id),
    supabase.from('receivables').select('pending_amount').eq('company_id', company.id).neq('status', 'cobrado'),
    supabase.from('payables').select('pending_amount').eq('company_id', company.id).neq('status', 'pagado'),
    supabase.from('products').select('name, stock_current, stock_min, cost_price').eq('company_id', company.id),
  ])

  const totalSales = (sales ?? []).reduce((s, a) => s + Number(a.total), 0)
  const totalPurchases = (purchases ?? []).reduce((s, a) => s + Number(a.total), 0)
  const totalReceivables = (receivables ?? []).reduce((s, a) => s + Number(a.pending_amount), 0)
  const totalPayables = (payables ?? []).reduce((s, a) => s + Number(a.pending_amount), 0)
  const grossMargin = totalSales - totalPurchases
  const inventoryValue = (products ?? []).reduce((s, p) => s + Number(p.stock_current) * Number(p.cost_price), 0)
  const lowStockProducts = (products ?? []).filter(p => Number(p.stock_current) <= Number(p.stock_min))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <p className="text-slate-500 text-sm mt-0.5">Resumen económico y financiero de la empresa.</p>
      </div>

      {/* Estado de resultados simplificado */}
      <Card>
        <CardHeader><CardTitle>📊 Estado de Resultados (simplificado)</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">Ventas totales</td>
                <td className="py-2 text-right font-medium text-green-600">{formatCurrency(totalSales)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">Compras totales</td>
                <td className="py-2 text-right font-medium text-red-600">({formatCurrency(totalPurchases)})</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 font-bold text-slate-800">Resultado bruto estimado</td>
                <td className={`py-3 text-right font-bold text-lg ${grossMargin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(grossMargin)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
            💡 Este es un cálculo simplificado. El resultado real debe considerar el costo de la mercadería realmente vendida (CMV), no el total de compras.
          </div>
        </CardContent>
      </Card>

      {/* Balance simplificado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>📥 Cuentas a cobrar</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totalReceivables > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
              {formatCurrency(totalReceivables)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Dinero que te deben los clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>📤 Cuentas a pagar</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totalPayables > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {formatCurrency(totalPayables)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Dinero que le debés a proveedores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>📦 Valor del inventario</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(inventoryValue)}</p>
            <p className="text-xs text-slate-500 mt-1">A precio de costo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>⚠️ Stock bajo</CardTitle></CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-3xl font-bold text-green-600">✓ OK</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-red-600">{lowStockProducts.length}</p>
                <ul className="mt-2 space-y-1">
                  {lowStockProducts.slice(0, 5).map((p, i) => (
                    <li key={i} className="text-xs text-red-600">• {p.name}: {p.stock_current}</li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        📄 <strong>Próximamente:</strong> Exportación a PDF y CSV, gráficos de evolución, flujo de fondos mensual, libro mayor por cuenta y balance de sumas y saldos completo.
      </div>
    </div>
  )
}
