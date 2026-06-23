import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import AccountingClient from './AccountingClient'
import { MicroModeBlock } from '@/components/MicroModeBlock'
import { SueldosSyncCard } from './SueldosSyncCard'

export default async function AccountingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase
    .from('companies').select('id, name, sector, cuit, microemprendimiento_mode')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1).single()
  if (!company) redirect('/companies/new')

  if (company.microemprendimiento_mode) {
    return <MicroModeBlock module="Contabilidad" />
  }

  const [
    { data: entries },
    { data: accounts },
    { data: sales },
    { data: purchases },
  ] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(id, code, name, type))')
      .eq('company_id', company.id)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, type, is_active')
      .eq('company_id', company.id)
      .order('code'),
    supabase
      .from('sales')
      .select('id, date, total, transaction_type, customer:customers(name, cuit)')
      .eq('company_id', company.id)
      .order('date', { ascending: true }),
    supabase
      .from('purchases')
      .select('id, date, total, transaction_type, supplier:suppliers(name, cuit)')
      .eq('company_id', company.id)
      .order('date', { ascending: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-y-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contabilidad</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {company.name} · {company.cuit}
          </p>
        </div>
        <Link href="/accounting/new">
          <Button>+ Nuevo asiento</Button>
        </Link>
      </div>

      <SueldosSyncCard
        companyId={company.id}
        userId={user.id}
        accounts={accounts ?? []}
      />

      <AccountingClient
        entries={entries ?? []}
        accounts={accounts ?? []}
        sales={sales ?? []}
        purchases={purchases ?? []}
        companyId={company.id}
        userId={user.id}
        companyName={company.name}
        companyCuit={company.cuit}
      />
    </div>
  )
}
