import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/utils/cn'

export default async function TreasuryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!company) redirect('/companies/new')

  const [{ data: accounts }, { data: movements }] = await Promise.all([
    supabase.from('cash_accounts').select('*').eq('company_id', company.id).order('name'),
    supabase.from('cash_movements').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(30),
  ])

  const totalCash = (accounts ?? []).filter((a: any) => a.type === 'caja').reduce((s: number, a: any) => s + Number(a.balance), 0)
  const totalBank = (accounts ?? []).filter((a: any) => a.type === 'banco').reduce((s: number, a: any) => s + Number(a.balance), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tesorería</h1>
        <p className="text-slate-500 text-sm mt-0.5">Saldos de caja y bancos, y movimientos de fondos.</p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es la tesorería?</strong> La tesorería controla todo el dinero de la empresa: cuánto hay en caja y en banco, qué entró y qué salió. Los movimientos se generan automáticamente con cada operación de compra, venta, cobro y pago.
      </div>

      {/* Saldos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="col-span-full md:col-span-1">
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total en caja</p>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalCash)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-full md:col-span-1">
          <CardContent>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total en banco</p>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalBank)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-full md:col-span-1 bg-blue-50 border-blue-200">
          <CardContent>
            <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Total disponible</p>
            <p className="text-3xl font-bold text-blue-700">{formatCurrency(totalCash + totalBank)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(accounts ?? []).map((a: any) => (
          <Card key={a.id}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{a.name}</p>
                  <Badge variant={a.type === 'caja' ? 'info' : 'default'} className="mt-1">{a.type}</Badge>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${Number(a.balance) < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatCurrency(Number(a.balance))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!movements || movements.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Sin movimientos registrados aún.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Concepto</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Importe</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m: any) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">{formatDate(m.date)}</td>
                    <td className="px-5 py-3 text-slate-800">{m.concept}</td>
                    <td className="px-5 py-3">
                      <Badge variant={m.type === 'ingreso' ? 'success' : 'danger'}>{m.type}</Badge>
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${m.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'ingreso' ? '+' : '-'} {formatCurrency(Number(m.amount))}
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
