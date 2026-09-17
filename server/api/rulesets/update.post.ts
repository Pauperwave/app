// server\api\rulesets\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { RulesetPointValues } from '~/composables/tournaments/pairing/useCommanderScoring'

interface UpdateRulesetBody {
  rulesetUuid: string
  name: string
  points: RulesetPointValues & { participation: number }
}

// Updates a ruleset's name and every category's point value. Doesn't touch
// is_default — flipping the default ruleset is a separate, rarer action
// with wider blast radius (every league with no ruleset of its own falls
// back to whichever one is_default), left out of this first pass.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { rulesetUuid, name, points } = await readBody<UpdateRulesetBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error: nameError } = await supabase
    .from('rulesets')
    .update({ name })
    .eq('uuid', rulesetUuid)

  if (nameError) {
    const statusCode = nameError.code === '23505' ? 409 : 500
    throw createError({ statusCode, statusMessage: nameError.message })
  }

  const results = await Promise.all(
    Object.entries(points).map(([category, value]) => supabase
      .from('ruleset__points')
      .update({ points: value })
      .eq('ruleset_uuid', rulesetUuid)
      .eq('category', category))
  )

  const failed = results.find(r => r.error)
  if (failed?.error) {
    throw createError({ statusCode: 500, statusMessage: failed.error.message })
  }

  return { success: true }
})
