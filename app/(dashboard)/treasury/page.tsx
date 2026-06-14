import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TreasuryClient from './TreasuryClient'

export default async function TreasuryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!company) redirect('/companies/new')

  const { data: accounts } = await supabase
    .from('cash_accounts')
    .select('*')
    .eq('company_id', company.id)
    .order('name')

  return (
    <TreasuryClient
      companyId={company.id}
      userId={user.id}
      initialAccounts={accounts ?? []}
    />
  )
}
