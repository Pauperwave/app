// server\api\tournaments\[id]\update.post.ts
import type { NewTournamentPayload } from '#shared/types/tournaments'

// Same convention as create.post.ts: tournaments' RLS (management_full_access)
// already gates writes to management users, but every write still goes
// through a BFF endpoint rather than relying on RLS evaluated from the client.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewTournamentPayload>(event)

  // Read before write, so a tournament moved between leagues (or unlinked
  // entirely) recomputes both the league it left and the one it joined —
  // see recomputeLeagueDates.
  const { data: existing } = await supabase
    .from('tournaments')
    .select('league_uuid')
    .eq('id', id)
    .single()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({
      name: body.name,
      status: body.status,
      format_uuid: body.formatUuid,
      location_uuid: body.locationUuid,
      organizer_uuid: body.organizerUuid,
      league_uuid: body.leagueUuid,
      event_uuid: body.eventUuid,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      round_count: body.roundCount,
      entry_fee: body.entryFee,
      description: body.description,
      prizes: body.prizes,
      companion_code: body.companionCode,
      image_url: body.imageUrl,
      image_card_name: body.imageCardName,
      image_card_artist: body.imageCardArtist
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament update failed'
    })
  }

  await recomputeLeagueDates(supabase, tournament.league_uuid)
  if (existing && existing.league_uuid !== tournament.league_uuid) {
    await recomputeLeagueDates(supabase, existing.league_uuid)
  }

  return { tournament }
})
