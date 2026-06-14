import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/cn'
import InventoryClient from './InventoryClient'
import Link from 'next/link'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!company) redirect('/companies/new')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', company.id)
    .order('name')

  const all = products ?? []
  const totalValue = all.reduce((s, p) => s + Number(p.stock_current) * Number(p.cost_price), 0)
  const lowStockCount  = all.filter(p => Number(p.stock_current) > 0 && Number(p.stock_current) <= Number(p.stock_min)).length
  const noStockCount   = all.filter(p => Number(p.stock_current) === 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-500 text-sm mt-0.5">Control de stock de todos los productos.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchases/new"
            className="text-sm font-medium text-blue-700 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors">
            + Nueva compra
          </Link>
          <Link href="/products"
            className="text-sm font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
            Gestionar productos →
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es el inventario?</strong> Muestra la cantidad disponible de cada producto. El stock se actualiza automáticamente con cada compra (sube) y cada venta (baja). Cuando el stock llega al mínimo, aparece una alerta para reponer mercadería.
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total productos</p>
          <p className="text-2xl font-bold text-slate-800">{all.length}</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Stock bajo</p>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {lowStockCount}
          </p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Sin stock</p>
          <p className={`text-2xl font-bold ${noStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {noStockCount}
          </p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Valor inventario</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalValue)}</p>
        </CardContent></Card>
      </div>

      <InventoryClient
        products={all}
        companyId={company.id}
        userId={user.id}
      />
    </div>
  )
}
