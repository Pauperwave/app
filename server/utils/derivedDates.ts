// server\utils\derivedDates.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Leagues (ADR-019, 2026-08-16) and events (2026-10-02, an event is just a folder of tournaments)
// don't own their dates: starts_at/ends_at are the earliest start and latest end among their
// still-active (non soft-deleted) tournaments. Recomputed after every tournaments write that could
// move them: create.post.ts, [id]/update.post.ts (old and new parent, if it changed),
// [id]/delete.post.ts, [id]/league.post.ts and trash/restore.post.ts. A parent left with no
// tournaments gets null on both columns — useLeaguesQuery.ts/useEventsQuery.ts then fall back to
// created_at.

async function tournamentSpan(
  supabase: SupabaseClient<Database>,
  parentColumn: 'league_uuid' | 'event_uuid',
  parentUuid: string
) {
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('starts_at, ends_at')
    .eq(parentColumn, parentUuid)
    .is('deleted_at', null)

  const startDates = (tournaments ?? [])
    .map(tournament => tournament.starts_at)
    .filter((value): value is string => !!value)
    .sort()
  // A tournament with no end still occupies its start (otherwise an event of open-ended
  // tournaments would have no end at all).
  const endDates = (tournaments ?? [])
    .map(tournament => tournament.ends_at ?? tournament.starts_at)
    .filter((value): value is string => !!value)
    .sort()

  return {
    starts_at: startDates[0] ?? null,
    ends_at: endDates[endDates.length - 1] ?? null
  }
}

export async function recomputeLeagueDates(
  supabase: SupabaseClient<Database>,
  leagueUuid: string | null
) {
  if (!leagueUuid) return

  await supabase
    .from('leagues')
    .update(await tournamentSpan(supabase, 'league_uuid', leagueUuid))
    .eq('uuid', leagueUuid)
}

export async function recomputeEventDates(
  supabase: SupabaseClient<Database>,
  eventUuid: string | null
) {
  if (!eventUuid) return

  await supabase
    .from('events')
    .update(await tournamentSpan(supabase, 'event_uuid', eventUuid))
    .eq('uuid', eventUuid)
}
