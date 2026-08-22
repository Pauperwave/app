// server\api\leagues\[id]\ruleset.post.ts
interface SetLeagueRulesetBody {
  rulesetUuid: string | null
}

// Dedicated partial-update endpoint (mirrors status.post.ts) for the
// grid card's own inline ruleset picker (LeaguesRulesetBadge.vue,
// 2026-08-22) — update.post.ts requires the full NewLeaguePayload shape,
// which the card doesn't have per row.
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
