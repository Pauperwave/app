// server\api\tournament-registrations\register.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface RegisterBody {
  tournamentUuid: string
  associateUuids: string[]
  // 'checked_in' for a walk-in added straight to "Iscritti (Pagato)"
  // ("Aggiungi giocatori"); omitted (defaults to 'registered') for
  // "Aggiungi ai pre-registrati".
  status?: 'registered' | 'checked_in'
}

// Delegates the get-or-create-players + upsert-registrations pair to a
// single RPC (register_tournament_players, migration 20260825110000) so
// the two writes are one Postgres transaction — a mid-way failure can no
// longer leave an orphaned `players` row with no registration, which two
// separate Supabase JS calls couldn't guarantee.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, associateUuids, status = 'registered' } = await readBody<RegisterBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('register_tournament_players', {
    p_tournament_uuid: tournamentUuid,
    p_associate_uuids: associateUuids,
    p_status: status
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { registrations: data ?? [] }
})
