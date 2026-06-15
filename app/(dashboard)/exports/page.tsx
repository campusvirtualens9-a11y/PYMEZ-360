import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExportsClient from './ExportsClient'

export default async function ExportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, cuit, iibb_rate, address')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1).single()
  if (!company) redirect('/companies/new')

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
      .select('id, date, total, iva_rate, customer:customers(name, cuit)')
      .eq('company_id', company.id)
      .order('date', { ascending: true }),
    supabase
      .from('purchases')
      .select('id, date, total, iva_rate, supplier:suppliers(name, cuit)')
      .eq('company_id', company.id)
      .order('date', { ascending: true }),
  ])

  return (
    <ExportsClient
      company={company}
      entries={entries ?? []}
      accounts={accounts ?? []}
      sales={sales ?? []}
      purchases={purchases ?? []}
    />
  )
}
