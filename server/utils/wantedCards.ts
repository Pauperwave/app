// server\utils\wantedCards.ts
import type { H3Event } from 'h3'
import type { JwtPayload, PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Shared by wanted-cards/create.post.ts and [id]/update.post.ts: a Supabase write, the same error
// check, then the background CardTrader prefetch

// Status changes and deletes aren't management-only: a requester can manage their own card,
// everyone else needs has_management_permissions.
// Full edits (update.post.ts, refresh-prices.post.ts) stay requireManagementPermission-only.
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

// Warms the CardTrader cache (server/utils/cardTrader.ts) so "Search on CardTrader" finds the row
// ready. Doesn't block the response and fails silently: the on-demand resolve retries anyway.
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
