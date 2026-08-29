// server\api\tournaments\[id]\league.post.ts
interface SetTournamentLeagueBody {
  leagueUuid: string | null
}

// Dedicated partial-update endpoint (mirrors [id]/status.post.ts and
// [id]/entry-fee.post.ts) for the bulk "assign to league" action — both the
// tournaments-side bulk-actions bar and a league detail page's own "add
// tournaments" picker use this, neither has the full NewTournamentPayload
// shape update.post.ts requires. Same recompute cascade as update.post.ts:
// a tournament moved between leagues (or unlinked) recomputes both the
// league it left and the one it joined.
// fallow-ignore-next-line code-duplication -- read-existing-league-then-
// update-and-recompute shape mirrors update.post.ts, but the update payload
// itself (one field vs. the full NewTournamentPayload) genuinely differs —
// see the top-of-file comment.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetTournamentLeagueBody>(event)

  const { data: existing } = await supabase
    .from('tournaments')
    .select('league_uuid')
    .eq('id', id)
    .single()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({ league_uuid: body.leagueUuid })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament league update failed'
    })
  }

  await recomputeLeagueDates(supabase, tournament.league_uuid)
  if (existing && existing.league_uuid !== tournament.league_uuid) {
    await recomputeLeagueDates(supabase, existing.league_uuid)
  }

  return { tournament }
})
