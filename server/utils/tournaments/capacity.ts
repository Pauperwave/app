// server\utils\tournaments\capacity.ts
// A tournament's player cap (tournaments.max_entrants, migration 20261003110000). Only
// self-registration stops at it — the web endpoint and the Telegram bot; an organizer registering
// someone by hand (register.post.ts) can still go over. No-shows don't take a place.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

export async function tournamentIsFull(
  supabase: SupabaseClient<Database>,
  tournamentUuid: string
): Promise<boolean> {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('max_entrants')
    .eq('uuid', tournamentUuid)
    .single()

  if (!tournament?.max_entrants) return false

  const { count } = await supabase
    .from('tournament_registrations')
    .select('uuid', { count: 'exact', head: true })
    .eq('tournament_uuid', tournamentUuid)
    .neq('status', 'no_show')

  return (count ?? 0) >= tournament.max_entrants
}
