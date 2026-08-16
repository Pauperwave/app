// server\api\wanted-cards\[id]\delete.post.ts
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)

  const { error } = await supabase
    .from('pauperwave_wanted_cards')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { deleted: true }
})
