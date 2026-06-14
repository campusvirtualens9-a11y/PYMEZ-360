import { createClient } from '@/lib/supabase/client'

const XP_TABLE = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000]

export function xpToLevel(xp: number): number {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) return i + 1
  }
  return 1
}

export function xpForNextLevel(currentXp: number): { needed: number; progress: number } {
  const level = xpToLevel(currentXp)
  const current = XP_TABLE[level - 1] ?? 0
  const next = XP_TABLE[level] ?? XP_TABLE[XP_TABLE.length - 1]
  const range = next - current
  const needed = next - currentXp
  const progress = Math.min(100, Math.round(((currentXp - current) / Math.max(1, range)) * 100))
  return { needed, progress }
}

export async function awardXp(params: {
  profileId: string
  companyId?: string
  amount: number
  reason: string
}): Promise<void> {
  const supabase = createClient()

  await supabase.from('xp_events').insert({
    profile_id: params.profileId,
    company_id: params.companyId ?? null,
    amount: params.amount,
    reason: params.reason,
  })

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', params.profileId)
    .single()

  if (!profile) return

  const newXp = Number(profile.xp) + params.amount
  const newLevel = xpToLevel(newXp)

  await supabase
    .from('profiles')
    .update({ xp: newXp, level: newLevel })
    .eq('id', params.profileId)
}

export async function updateChallengeProgress(params: {
  profileId: string
  companyId: string
  challengeCode: string
  increment?: number
}): Promise<{ completed: boolean; xpAwarded: number }> {
  const supabase = createClient()

  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, required_count, xp_reward, title')
    .eq('code', params.challengeCode)
    .single()

  if (!challenge) return { completed: false, xpAwarded: 0 }

  const { data: existing } = await supabase
    .from('user_challenges')
    .select('id, progress, completed')
    .eq('profile_id', params.profileId)
    .eq('company_id', params.companyId)
    .eq('challenge_id', challenge.id)
    .maybeSingle()

  if (existing?.completed) return { completed: true, xpAwarded: 0 }

  const currentProgress = existing?.progress ?? 0
  const newProgress = currentProgress + (params.increment ?? 1)
  const completed = newProgress >= challenge.required_count

  if (existing) {
    await supabase
      .from('user_challenges')
      .update({
        progress: newProgress,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_challenges').insert({
      profile_id: params.profileId,
      company_id: params.companyId,
      challenge_id: challenge.id,
      progress: newProgress,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
  }

  if (completed) {
    await awardXp({
      profileId: params.profileId,
      companyId: params.companyId,
      amount: challenge.xp_reward,
      reason: `Desafío completado: ${challenge.title}`,
    })
    return { completed: true, xpAwarded: challenge.xp_reward }
  }

  return { completed: false, xpAwarded: 0 }
}

export async function getCompanyProgress(
  profileId: string,
  companyId: string
): Promise<number> {
  const supabase = createClient()

  const { count: totalCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })

  const { count: completedCount } = await supabase
    .from('user_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('company_id', companyId)
    .eq('completed', true)

  return Math.round(((completedCount ?? 0) / Math.max(1, totalCount ?? 1)) * 100)
}
