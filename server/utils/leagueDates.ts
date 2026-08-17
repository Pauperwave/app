// server\utils\leagueDates.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// ADR (docs/PROGRESS.md, 2026-08-16): a league's starts_at/ends_at are no
// longer editable directly — they're derived from the earliest starts_at and
// latest ends_at among its still-active (non soft-deleted) tournaments.
// Called after every tournaments write that could move that min/max:
// create.post.ts, [id]/update.post.ts (both the old and new league_uuid, if
// it changed), [id]/delete.post.ts. A league left with zero tournaments
// falls back to null on both columns — useLeaguesQuery.ts already handles a
// null starts_at by falling back to created_at.
export async function recomputeLeagueDates(
  supabase: SupabaseClient<Database>,
  leagueUuid: string | null
) {
  if (!leagueUuid) return

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('starts_at, ends_at')
    .eq('league_uuid', leagueUuid)
    .is('deleted_at', null)

  const startDates = (tournaments ?? [])
    .map(tournament => tournament.starts_at)
    .filter((value): value is string => !!value)
    .sort()
  const endDates = (tournaments ?? [])
    .map(tournament => tournament.ends_at)
    .filter((value): value is string => !!value)
    .sort()

  await supabase
    .from('leagues')
    .update({
      starts_at: startDates[0] ?? null,
      ends_at: endDates[endDates.length - 1] ?? null
    })
    .eq('uuid', leagueUuid)
}
