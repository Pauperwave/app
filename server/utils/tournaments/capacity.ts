// server\utils\tournaments\capacity.ts
// A tournament's player cap (tournaments.max_entrants, migration 20261003110000). Only
// self-registration stops at it — the web endpoint and the Telegram bot; an organizer registering
// someone by hand (register.post.ts) can still go over. The rule itself (no-shows give their
// place back) is shared with the interface: shared/utils/tournaments/capacity.ts.
import type { SupabaseClient } from '@supabase/supabase-js'
import { NO_SHOW_STATUS, isTournamentFull } from '#shared/utils/tournaments/capacity'
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
    .neq('status', NO_SHOW_STATUS)

  return isTournamentFull(tournament.max_entrants, count ?? 0)
}
