'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/utils/cn'
import type { Profile } from '@/types'

interface HeaderProps {
  profile: Profile | null
  companyName?: string
}

export function Header({ profile, companyName }: HeaderProps) {
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
    <header className="fixed top-0 left-[260px] right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm">
      {/* Empresa activa */}
      <div className="flex items-center gap-2">
        {companyName ? (
          <>
            <span className="text-slate-400 text-sm">Empresa:</span>
            <span className="font-semibold text-slate-800 text-sm">{companyName}</span>
          </>
        ) : (
          <span className="text-slate-400 text-sm italic">Sin empresa seleccionada</span>
        )}
      </div>

      {/* Usuario */}
      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 ${levelColor} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
              {profile.level}
            </div>
            <span className="text-xs text-slate-500 font-medium">{profile.xp} XP</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {getInitials(profile?.full_name ?? 'U')}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {profile?.full_name ?? 'Usuario'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
        >
          Salir
        </button>
      </div>
    </header>
  )
}
