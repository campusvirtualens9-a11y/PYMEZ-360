import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/utils/cn'
import AccountingClient from './AccountingClient'

export default async function AccountingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!company) redirect('/companies/new')

  const [{ data: entries }, { data: accounts }] = await Promise.all([
    supabase.from('journal_entries')
      .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code, name))')
      .eq('company_id', company.id)
      .order('date', { ascending: false })
      .limit(20),
    supabase.from('chart_of_accounts')
      .select('*')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('code'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Contabilidad</h1>
        <p className="text-slate-500 text-sm mt-0.5">Asientos contables automáticos y plan de cuentas.</p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es la contabilidad?</strong> La contabilidad registra todos los movimientos económicos de la empresa mediante "asientos". Cada operación (compra, venta, cobro, pago) genera automáticamente un asiento contable con débitos y créditos que siempre deben estar en equilibrio.
      </div>

      {/* Plan de cuentas */}
      <Card>
        <CardHeader>
          <CardTitle>Plan de cuentas</CardTitle>
          <Badge variant="info">{(accounts ?? []).length} cuentas</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Código</th>
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Cuenta</th>
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {(accounts ?? []).map((a: any) => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{a.code}</td>
                  <td className="px-5 py-2.5 text-slate-800">{a.name}</td>
                  <td className="px-5 py-2.5">
                    <Badge variant={
                      a.type === 'activo' ? 'info' :
                      a.type === 'pasivo' ? 'danger' :
                      a.type === 'ingreso' ? 'success' :
                      a.type === 'egreso' ? 'warning' : 'default'
                    }>
                      {a.type}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Libro Diario */}
      <AccountingClient entries={entries ?? []} companyId={company.id} userId={user.id} />
    </div>
  )
}
