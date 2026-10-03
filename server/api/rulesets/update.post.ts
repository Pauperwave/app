// server\api\rulesets\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { RulesetPointValues } from '#shared/utils/tournaments/commanderScoring'

interface UpdateRulesetBody {
  rulesetUuid: string
  name: string
  points: RulesetPointValues & { participation: number }
}

// Updates a ruleset's name and every category's point value. Doesn't touch is_default: changing the
// default affects every league without its own ruleset, so it's a separate action.
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
