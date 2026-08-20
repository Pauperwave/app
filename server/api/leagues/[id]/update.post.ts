// server\api\leagues\[id]\update.post.ts
import type { NewLeaguePayload } from '#shared/types/leagues'

// Same convention as tournaments/[id]/update.post.ts: leagues' RLS
// (management_full_access) already gates writes to management users, but
// every write still goes through a BFF endpoint rather than relying on RLS
// evaluated from the client.
// No starts_at/ends_at write here (2026-08-16 ADR, docs/PROGRESS.md): those
// columns are owned exclusively by recomputeLeagueDates, run off tournament
// writes, not by this endpoint.
export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewLeaguePayload>(event)

  // Read before write, so the cascade below only fires when image_url is
  // actually changing (see the ADR in docs/PROGRESS.md) — without this, every
  // unrelated league edit (renaming, changing the ruleset, ...) would
  // resubmit the same image_url and silently re-stomp any per-tournament
  // cover a tournament inside this league had been given individually.
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

  // ADR (docs/PROGRESS.md): a league's cover image is the source of truth for
  // every tournament inside it — changing it cascades onto every tournament
  // currently linked via tournaments.league_uuid, overwriting whatever
  // image_url those tournaments had set individually. The attribution pair
  // rides along with image_url unconditionally here (no separate dirty-check)
  // since they only ever change together, from the same CardArtPicker pick.
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
