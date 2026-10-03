// server\api\players\[id]\delete.post.ts
// Hard delete: players has no deleted_at (unlike SoftDeletableTable in idRequest.ts). Every table
// hanging off a player has its player_uuid FK ON DELETE RESTRICT, so Postgres refuses to delete one
// with tournament history; surfaced as a 409 the client can explain instead of a raw 500.
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
