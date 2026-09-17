// server\api\rulesets\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { RulesetPointValues } from '~/composables/tournaments/useCommanderScoring'

interface CreateRulesetBody {
  name: string
  points: RulesetPointValues & { participation: number }
}

// Restores a real ruleset editor (user request, 2026-09-17) — league had one
// (RulesetFormModal.vue) backed by flat columns on the ruleset row; this
// app's schema normalizes point values into ruleset__points (category rows),
// so creating a ruleset means one insert plus 8 category rows.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { name, points } = await readBody<CreateRulesetBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: ruleset, error: rulesetError } = await supabase
    .from('rulesets')
    .insert({ name })
    .select('uuid')
    .single()

  if (rulesetError) {
    const statusCode = rulesetError.code === '23505' ? 409 : 500
    throw createError({ statusCode, statusMessage: rulesetError.message })
  }

  const { error: pointsError } = await supabase
    .from('ruleset__points')
    .insert(Object.entries(points).map(([category, value]) => ({
      ruleset_uuid: ruleset.uuid,
      category,
      points: value
    })))

  if (pointsError) {
    throw createError({ statusCode: 500, statusMessage: pointsError.message })
  }

  return { rulesetUuid: ruleset.uuid }
})
