// server\api\tournament-registrations\self-register.post.ts

// Player self-registration — deliberately not requireManagementPermission
// like register.post.ts: any logged-in user may call this, but only ever
// for themselves. associateUuid is resolved server-side from the session
// (resolveAuditAssociateUuid), never taken from the request body, so the
// caller can't register anyone else. RLS already has policies named for
// exactly this (player_own_registration/player_delete_own on
// tournament_registrations) — this endpoint exists anyway to reuse
// register_tournament_players' atomic get-or-create-player step (a raw
// client-side insert would fail for a first-time registrant with no
// players row yet).
export default defineEventHandler(async (event) => {
  const { tournamentUuid, associateUuid, supabase } = await parseSelfRegistrationRequest(event)

  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('status, organizer:organizations(type)')
    .eq('uuid', tournamentUuid)
    .is('deleted_at', null)
    .single()

  if (tournamentError || !tournament) {
    throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })
  }
  // Shop organizers (Magman etc.) are reference-only — Pauperwave doesn't
  // run their registrations, same rule RegisterButton.vue (client-side) and
  // the Telegram bot's detail.ts (isExternalOrganizer) enforce.
  if (tournament.status !== 'registration_open' || tournament.organizer?.type === 'shop') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le iscrizioni per questo torneo non sono aperte'
    })
  }

  const { data, error } = await supabase.rpc('register_tournament_players', {
    p_tournament_uuid: tournamentUuid,
    p_associate_uuids: [associateUuid]
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { registration: data?.[0] ?? null }
})
