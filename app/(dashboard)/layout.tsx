import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <Sidebar />
        <Header profile={profile} companyName={company?.name} />
      </div>
      <main className="ml-[260px] pt-14 min-h-screen print:ml-0 print:pt-0">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
