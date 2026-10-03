// server\utils\tournamentRoundRpc.ts
// Shared by every round-lifecycle RPC endpoint (Commander and Swiss): the {data, error} ->
// value-or-throw unwrap, like wantedCards.ts's ensureWantedCardRow but accepting a legitimately
// null `data` (advance-round's roundUuid is null when the tournament just ended).
import type { PostgrestError } from '@supabase/supabase-js'

export function unwrapRoundRpc<T>(data: T, error: PostgrestError | null): T {
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

// For RPCs with no useful data payload (turn-back-round, reset/undraw-pairing).
export function assertRoundRpcOk(error: PostgrestError | null): void {
  unwrapRoundRpc(undefined, error)
}
