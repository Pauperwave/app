// server\utils\tournaments\definePairingWriteHandler.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export interface PairingWriteContext<Body extends { pairingUuid: string }> {
  supabase: SupabaseClient<Database>
  body: Body
}

// The guard every write to one table's data (result, kills, votes, commander, reset) shares:
// management permission, then the pairing's round must still be in progress. `handle` only has
// the write itself left to do.
export function definePairingWriteHandler<Body extends { pairingUuid: string }, Result>(
  handle: (context: PairingWriteContext<Body>) => Promise<Result>
) {
  return defineEventHandler(async (event) => {
    await requireManagementPermission(event)

    const body = await readBody<Body>(event)
    const supabase = serverSupabaseServiceRole<Database>(event)
    await assertPairingEditable(supabase, body.pairingUuid)

    return handle({ supabase, body })
  })
}
