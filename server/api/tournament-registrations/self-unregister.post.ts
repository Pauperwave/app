// server\api\tournament-registrations\self-unregister.post.ts

// Player self-unregistration, same ownership model as self-register.post.ts. Only 'registered' rows
// can be self-removed: once staff checked someone in or marked a no-show, undoing it is a staff
// decision (delete.post.ts). No payment cleanup: a never-checked-in row has no "Tournament Fee"
// payment yet.
export default defineEventHandler(async (event) => {
  const { tournamentUuid, associateUuid, supabase } = await parseSelfRegistrationRequest(event)
  await assertRegistrationsEditable(supabase, tournamentUuid)

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
