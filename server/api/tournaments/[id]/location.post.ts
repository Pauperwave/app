// server\api\tournaments\[id]\location.post.ts
interface SetTournamentLocationBody {
  locationUuid: string | null
}

// Dedicated partial-update endpoint (mirrors [id]/status.post.ts and
// [id]/entry-fee.post.ts) for the inline "change venue" badge — update.post.ts
// requires the full NewTournamentPayload shape.
// fallow-ignore-next-line code-duplication -- see [id]/entry-fee.post.ts
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<SetTournamentLocationBody>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({ location_uuid: body.locationUuid })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament location update failed'
    })
  }

  return { tournament }
})
