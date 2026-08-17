// server\api\tournaments\[id]\delete.post.ts
// Soft delete (deleted_at), not a hard row delete — useTournamentsQuery.ts
// already filters `is('deleted_at', null)`, same convention as
// pauperwave_associates/pauperwave_payments; a tournament that already
// happened shouldn't vanish from history just because it's removed from the
// active list.
export default defineEventHandler(async (event) => {
  const { id, supabase } = await parseIdRequest(event)

  // Read before soft-delete so the league it belonged to (if any) still
  // recomputes its starts_at/ends_at without this tournament — see
  // recomputeLeagueDates.
  const { data: existing } = await supabase
    .from('tournaments')
    .select('league_uuid')
    .eq('id', id)
    .single()

  await softDeleteById(supabase, 'tournaments', id)
  await recomputeLeagueDates(supabase, existing?.league_uuid ?? null)

  return { deleted: true }
})
