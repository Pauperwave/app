// server\utils\wantedCards.ts
import type { H3Event } from 'h3'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Shared by server/api/wanted-cards/create.post.ts and .../[id]/update.post.ts
// (fallow dupes, 2026-08-12): both a Supabase write followed by the same
// error-check, then the same background CardTrader prefetch.

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
