// server\api\tournaments\[id]\delete.post.ts
// Soft delete (deleted_at; useTournamentsQuery.ts filters on it): a past tournament shouldn't
// vanish from history.
export default defineEventHandler(async (event) => {
  const { id, user, supabase } = await parseIdRequest(event)

  // Read before soft-delete so its league/event still recomputes dates without it (derivedDates.ts)
  const { data: existing } = await supabase
    .from('tournaments')
    .select('league_uuid, event_uuid')
    .eq('id', id)
    .single()

  await softDeleteById(event, user, supabase, 'tournaments', id)
  await recomputeLeagueDates(supabase, existing?.league_uuid ?? null)
  await recomputeEventDates(supabase, existing?.event_uuid ?? null)

  return { deleted: true }
})
