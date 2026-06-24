'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useMicroMode() {
  const [mode, setMode]           = useState(false)
  const [loading, setLoading]     = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('companies')
        .select('id, microemprendimiento_mode')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setCompanyId(data.id)
        setMode(data.microemprendimiento_mode ?? false)
      }
      setLoading(false)
    }
    load()

    const handler = (e: Event) => {
      setMode((e as CustomEvent<boolean>).detail)
    }
    window.addEventListener('micromode-changed', handler)
    return () => window.removeEventListener('micromode-changed', handler)
  }, [])

  async function toggle() {
    if (!companyId) return
    const newMode = !mode
    setMode(newMode)
    window.dispatchEvent(new CustomEvent('micromode-changed', { detail: newMode }))
    const supabase = createClient()
    await supabase
      .from('companies')
      .update({ microemprendimiento_mode: newMode })
      .eq('id', companyId)
  }

  return { mode, loading, toggle }
}
