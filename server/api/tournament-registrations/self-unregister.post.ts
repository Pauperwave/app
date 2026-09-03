// server\api\tournament-registrations\self-unregister.post.ts

// Player self-unregistration, same ownership model as self-register.post.ts
// — associateUuid resolved server-side, never from the body. Only 'registered'
// rows can be self-removed: once staff has checked someone in (or marked a
// no-show), undoing that is a staff decision (delete.post.ts,
// requireManagementPermission), not a player self-service action. No
// payment cleanup here unlike delete.post.ts — a still-'registered' (never
// checked-in) row can't have a "Tournament Fee" payment behind it yet in
// the normal flow.
export default defineEventHandler(async (event) => {
  const { tournamentUuid, associateUuid, supabase } = await parseSelfRegistrationRequest(event)

  const { data: registration, error: findError } = await supabase
    .from('tournament_registrations')
    .select('uuid, status, players!inner(associate_uuid)')
    .eq('tournament_uuid', tournamentUuid)
    .eq('players.associate_uuid', associateUuid)
    .maybeSingle()

  if (findError) {
    throw createError({ statusCode: 500, statusMessage: findError.message })
  }
  if (!registration) {
    throw createError({ statusCode: 404, statusMessage: 'Nessuna iscrizione trovata' })
  }
  if (registration.status !== 'registered') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Non puoi disiscriverti dopo il check-in'
    })
  }

  const { error: deleteError } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('uuid', registration.uuid)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: deleteError.message })
  }

  return { success: true }
})
