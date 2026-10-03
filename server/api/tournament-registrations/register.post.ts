// server\api\tournament-registrations\register.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface RegisterBody {
  tournamentUuid: string
  associateUuids: string[]
  // 'checked_in' for a walk-in added straight to "Iscritti (Pagato)"; omitted (defaults to
  // 'registered') for "Aggiungi ai pre-registrati"
  status?: 'registered' | 'checked_in'
}

// Delegates get-or-create-players + upsert-registrations to one RPC (register_tournament_players)
// so both writes share a Postgres transaction and can't leave an orphaned `players` row.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, associateUuids, status = 'registered' } = await readBody<RegisterBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await assertRegistrationsEditable(supabase, tournamentUuid)

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
