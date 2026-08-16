// server\api\mtg-formats\[id]\delete.post.ts
// No soft-delete/active flag (YAGNI for a lookup table this small) — a
// format still referenced by a tournament simply fails to delete on the
// fk_tournaments_format_uuid_fkey constraint, surfaced as a plain error toast.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)

  const { error } = await supabase
    .from('mtg_formats')
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
