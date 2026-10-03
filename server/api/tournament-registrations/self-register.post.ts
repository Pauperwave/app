// server\api\tournament-registrations\self-register.post.ts

// Player self-registration: any logged-in user, but only for themselves (unlike register.post.ts).
// associateUuid comes from the session (resolveAuditAssociateUuid), never the body. A BFF endpoint
// despite the player_own_registration RLS policies, to reuse register_tournament_players' atomic
// get-or-create (a raw insert fails for a first-time registrant with no players row).
export default defineEventHandler(async (event) => {
  const { tournamentUuid, associateUuid, supabase } = await parseSelfRegistrationRequest(event)

  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('status, is_test, organizer:organizations(type)')
    .eq('uuid', tournamentUuid)
    .is('deleted_at', null)
    .single()

  // Service role bypasses RLS, so a test tournament has to be hidden here too.
  if (tournamentError || !tournament || tournament.is_test) {
    throw createError({ statusCode: 404, statusMessage: 'Torneo non trovato' })
  }
  // Shop organizers (Magman etc.) are reference-only: Pauperwave doesn't run their registrations,
  // same rule as RegisterButton.vue and the Telegram bot's isExternalOrganizer
  if (tournament.status !== 'registration_open' || tournament.organizer?.type === 'shop') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le iscrizioni per questo torneo non sono aperte'
    })
  }

  if (await tournamentIsFull(supabase, tournamentUuid)) {
    throw createError({ statusCode: 409, statusMessage: 'Posti esauriti per questo torneo' })
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
