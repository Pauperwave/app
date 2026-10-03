// server\api\leagues\[id]\update.post.ts
import type { NewLeaguePayload } from '#shared/types/leagues'

// Same convention as tournaments/[id]/update.post.ts: RLS gates writes, every write still goes
// through a BFF endpoint. No starts_at/ends_at write: recomputeLeagueDates owns those columns (ADR,
// docs/PROGRESS.md).
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewLeaguePayload>(event)

  // Read before write so the cascade below only fires when image_url actually changes; otherwise
  // any unrelated league edit would overwrite per-tournament covers
  const { data: existing } = await supabase
    .from('leagues')
    .select('uuid, image_url')
    .eq('id', id)
    .single()

  const { data: league, error } = await supabase
    .from('leagues')
    .update({
      name: body.name,
      status: body.status,
      ruleset_uuid: body.rulesetUuid,
      image_url: body.imageUrl,
      image_card_name: body.imageCardName,
      image_card_artist: body.imageCardArtist
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !league) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'League update failed'
    })
  }

  // ADR (docs/PROGRESS.md): a league's cover is the source of truth for its tournaments, so
  // changing it overwrites every linked tournament's image_url. The attribution pair rides along
  // since they change together.
  if (existing && existing.image_url !== body.imageUrl) {
    await supabase
      .from('tournaments')
      .update({
        image_url: body.imageUrl,
        image_card_name: body.imageCardName,
        image_card_artist: body.imageCardArtist
      })
      .eq('league_uuid', league.uuid)
  }

  return { league }
})
