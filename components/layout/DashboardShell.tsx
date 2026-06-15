'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile | null
  companyName?: string
  children: React.ReactNode
}

export function DashboardShell({ profile, companyName, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        {/* Overlay móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Header
          profile={profile}
          companyName={companyName}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
      </div>
      <main className="lg:ml-[260px] pt-14 min-h-screen print:ml-0 print:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
