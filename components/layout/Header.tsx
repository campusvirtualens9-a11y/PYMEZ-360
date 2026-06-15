'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/utils/cn'
import type { Profile } from '@/types'

interface HeaderProps {
  profile: Profile | null
  companyName?: string
  onMenuToggle?: () => void
}

export function Header({ profile, companyName, onMenuToggle }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const levelColors = ['bg-slate-400', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-orange-500']
  const levelColor = levelColors[Math.min((profile?.level ?? 1) - 1, levelColors.length - 1)]

  return (
    <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 z-30 shadow-sm">
      {/* Hamburger (solo mobile) + Empresa */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden flex flex-col gap-1 p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Abrir menú"
        >
          <span className="w-5 h-0.5 bg-slate-600 block" />
          <span className="w-5 h-0.5 bg-slate-600 block" />
          <span className="w-5 h-0.5 bg-slate-600 block" />
        </button>

        {companyName ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-slate-400 text-sm hidden sm:inline flex-shrink-0">Empresa:</span>
            <span className="font-semibold text-slate-800 text-sm truncate max-w-[120px] sm:max-w-[200px] lg:max-w-none">
              {companyName}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-sm italic">Sin empresa</span>
        )}
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {profile && (
          <div className="hidden sm:flex items-center gap-2">
            <div className={`w-6 h-6 ${levelColor} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
              {profile.level}
            </div>
            <span className="text-xs text-slate-500 font-medium">{profile.xp} XP</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {getInitials(profile?.full_name ?? 'U')}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden md:block max-w-[120px] truncate">
            {profile?.full_name ?? 'Usuario'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 whitespace-nowrap flex-shrink-0"
        >
          Salir
        </button>
      </div>
    </header>
  )
}
