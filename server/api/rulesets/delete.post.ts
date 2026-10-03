// server\api\rulesets\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface DeleteRulesetBody {
  rulesetUuid: string
}

// Admin-only ('delete-ruleset' is one tier above 'manage-rulesets' in permissions.ts): blocks
// deleting a ruleset still assigned to a league, like commander-decks/delete.post.ts.
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event)

  const { rulesetUuid } = await readBody<DeleteRulesetBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { count, error: usageError } = await supabase
    .from('leagues')
    .select('id', { count: 'exact', head: true })
    .eq('ruleset_uuid', rulesetUuid)

  if (usageError) {
    throw createError({ statusCode: 500, statusMessage: usageError.message })
  }
  if (count && count > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Ruleset is assigned to a league' })
  }

  const { error: pointsError } = await supabase
    .from('ruleset__points')
    .delete()
    .eq('ruleset_uuid', rulesetUuid)

  if (pointsError) {
    throw createError({ statusCode: 500, statusMessage: pointsError.message })
  }

  const { error } = await supabase
    .from('rulesets')
    .delete()
    .eq('uuid', rulesetUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
