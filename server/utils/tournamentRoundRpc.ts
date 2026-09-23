// server\utils\tournamentRoundRpc.ts
// Shared by every round-lifecycle RPC endpoint (advance/start-round-one/
// turn-back-round/reset-pairing/undraw-pairing, Commander and Swiss alike)
// — same {data, error} -> value-or-throw unwrap repeated in each one
// (fallow:dupes, 2026-09-23). Same granularity as
// server/utils/wantedCards.ts's own ensureWantedCardRow, but doesn't reject
// a legitimately null `data` (advance-round's roundUuid is null when the
// tournament just ended, not an error).
import type { PostgrestError } from '@supabase/supabase-js'

export function unwrapRoundRpc<T>(data: T, error: PostgrestError | null): T {
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

// For RPCs with no useful data payload (turn-back-round, reset/undraw-pairing).
export function assertRoundRpcOk(error: PostgrestError | null): void {
  unwrapRoundRpc(undefined, error)
}
