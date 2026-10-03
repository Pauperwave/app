// server\api\tournaments\[id]\update.post.ts
import type { NewTournamentPayload } from '#shared/types/tournaments'

// Same convention as create.post.ts: RLS gates writes, every write still goes through a BFF
// endpoint. fallow-ignore-next-line code-duplication -- see league.post.ts
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewTournamentPayload>(event)
  // Only a super_admin can see (so also create or edit) a test tournament.
  if (body.isTest !== undefined) await requireSuperAdminPermission(event)

  // Read before write so a tournament moved between leagues/events (or unlinked) recomputes both
  // the parent it left and the one it joined (derivedDates.ts)
  const { data: existing } = await supabase
    .from('tournaments')
    .select('league_uuid, event_uuid')
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
      round_duration_minutes: body.roundDurationMinutes ?? 75,
      entry_fee: body.entryFee,
      entry_fee_non_member: body.entryFeeNonMember,
      max_entrants: body.maxEntrants,
      decklist_visibility: body.decklistVisibility,
      registration_at: body.registrationAt,
      description: body.description,
      prizes: body.prizes,
      companion_code: body.companionCode,
      image_url: body.imageUrl,
      image_card_name: body.imageCardName,
      image_card_artist: body.imageCardArtist,
      telegram_notifications_enabled: body.telegramNotificationsEnabled,
      ...(body.isTest === undefined ? {} : { is_test: body.isTest })
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
  await recomputeEventDates(supabase, tournament.event_uuid)
  if (existing && existing.event_uuid !== tournament.event_uuid) {
    await recomputeEventDates(supabase, existing.event_uuid)
  }

  return { tournament }
})
