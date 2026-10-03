// server\api\leagues\[id]\ruleset.post.ts
interface SetLeagueRulesetBody {
  rulesetUuid: string | null
}

// Partial update for the grid card's inline ruleset picker (LeaguesRulesetBadge.vue, mirrors
// status.post.ts): update.post.ts requires the full NewLeaguePayload.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetLeagueRulesetBody>(event)

  const { data: league, error } = await supabase
    .from('leagues')
    .update({ ruleset_uuid: body.rulesetUuid })
    .eq('id', id)
    .select()
    .single()

  if (error || !league) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'League ruleset update failed'
    })
  }

  return { league }
})
