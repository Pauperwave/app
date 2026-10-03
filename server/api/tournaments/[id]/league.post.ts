// server\api\tournaments\[id]\league.post.ts
interface SetTournamentLeagueBody {
  leagueUuid: string | null
}

// Partial update for the bulk "assign to league" action, used by the tournaments bulk bar and the
// league page's "add tournaments" picker (neither has the full NewTournamentPayload). Same
// recompute cascade as update.post.ts: moving or unlinking a tournament recomputes both the league
// it left and the one it joined. fallow-ignore-next-line code-duplication -- see the top-of-file
// comment
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
