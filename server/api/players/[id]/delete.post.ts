// server\api\players\[id]\delete.post.ts
// Hard delete, not soft — players has no deleted_at column (unlike the
// SoftDeletableTable set in idRequest.ts). Every table that hangs off a
// player (event_attendees, commander_decks, tournament_registrations/
// pairings/standings/round_results/votes/kills) has its player_uuid FK set
// ON DELETE RESTRICT, so Postgres itself refuses to delete a player with any
// real tournament history — surfaced here as a 409 the client can show a
// specific message for, instead of a raw 500.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)

  if (error) {
    if (error.code === '23503') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Il giocatore ha dati collegati (tornei, decks, ...) e non può essere eliminato'
      })
    }
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { deleted: true }
})
