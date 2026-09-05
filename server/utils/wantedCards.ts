// server\utils\wantedCards.ts
import type { H3Event } from 'h3'
import type { JwtPayload, PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Shared by server/api/wanted-cards/create.post.ts and .../[id]/update.post.ts
// (fallow dupes, 2026-08-12): both a Supabase write followed by the same
// error-check, then the same background CardTrader prefetch.

// Status changes and deletes are no longer management-only (2026-09-05, user
// request, matching the /visibilita-adjacent bot feature that lets a linked
// chat mark/delete its own wanted-card requests): a requester can manage
// their own card even without has_management_permissions, but everyone else
// still needs it, same as before. Full edits (update.post.ts,
// refresh-prices.post.ts) are deliberately NOT covered by this — those stay
// requireManagementPermission-only, out of scope for this change.
export async function requireManagementOrWantedCardOwner(
  event: H3Event, supabase: SupabaseClient<Database>, id: number
): Promise<JwtPayload> {
  const user = await requireUser(event)
  if (await hasManagementPermission(event, user)) return user

  const ownAssociateUuid = await resolveAuditAssociateUuid(event, user)
  const { data: card } = await supabase
    .from('pauperwave_wanted_cards')
    .select('player_associate_uuid')
    .eq('id', id)
    .maybeSingle()

  if (!ownAssociateUuid || !card || card.player_associate_uuid !== ownAssociateUuid) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Permessi di gestione richiesti, oppure non è una tua richiesta'
    })
  }

  return user
}

export function ensureWantedCardRow<T>(
  data: T | null, error: PostgrestError | null, action: string
): T {
  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? `Wanted card ${action} failed`
    })
  }
  return data
}

// Warms the CardTrader cache (server/utils/cardTrader.ts) so the "Search on
// CardTrader" button finds the row ready instead of waiting for the resolve
// on click. Does not block the response — failure is silent, and the
// on-demand resolve will retry anyway.
export function prefetchCardTraderBlueprint(
  event: H3Event,
  supabase: SupabaseClient<Database>,
  scryfallId: string,
  setCode: string
) {
  const token = useRuntimeConfig(event).cardTraderApiToken
  if (token) {
    resolveCardTraderBlueprint(supabase, token, scryfallId, setCode).catch(() => {})
  }
}
