// app\composables\leagues\useLeaguesQuery.ts
import { tournamentProgressByLeague } from '#shared/utils/leagues/tournamentProgressByLeague'
import type { League, LeagueStatus } from '~/types'

export const LEAGUES_KEY = ['leagues']

interface LeagueTournamentRow {
  league_uuid: string | null
  status: string
  starts_at: string | null
  format: { name: string } | null
}

// Formats include every tournament regardless of status (ADR,
// docs/PROGRESS.md, 2026-08-22) — unlike the progress counters above, a
// cancelled tournament's format is still real history.
function tournamentFormatsByLeague(tournaments: LeagueTournamentRow[]) {
  const formats = new Map<string, Set<string>>()
  for (const row of tournaments) {
    if (!row.league_uuid || !row.format?.name) continue
    const leagueFormats = formats.get(row.league_uuid) ?? new Set<string>()
    leagueFormats.add(row.format.name)
    formats.set(row.league_uuid, leagueFormats)
  }
  return formats
}

// Same "every tournament regardless of status" reasoning as
// tournamentFormatsByLeague above — a cancelled tournament's date is still
// real history for the league's own date-range display.
function tournamentDateRangesByLeague(tournaments: LeagueTournamentRow[]) {
  const dateRanges = new Map<string, { start: string, end: string }>()
  for (const row of tournaments) {
    if (!row.league_uuid || !row.starts_at) continue
    const range = dateRanges.get(row.league_uuid)
    dateRanges.set(row.league_uuid, {
      start: !range || row.starts_at < range.start ? row.starts_at : range.start,
      end: !range || row.starts_at > range.end ? row.starts_at : range.end
    })
  }
  return dateRanges
}

// Migrated off mock data (server/api/leagues.ts, removed) onto the real
// `leagues` table — direct Supabase read + join, same pattern as
// useEventsQuery.ts. tournamentCount/completedTournamentCount are derived
// from a second, lightweight tournaments read (league_uuid + status only),
// same reasoning as useEventsQuery.ts's tournamentCount.
export function useLeaguesQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: LEAGUES_KEY,
    query: async (): Promise<League[]> => {
      const [leaguesResult, tournamentsResult] = await Promise.all([
        supabase
          .from('leagues')
          .select('*, ruleset:rulesets(name)')
          .is('deleted_at', null)
          .order('starts_at', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('tournaments')
          .select('league_uuid, status, starts_at, format:mtg_formats(name)')
          .not('league_uuid', 'is', null)
          .is('deleted_at', null)
      ])

      if (leaguesResult.error) throw leaguesResult.error
      if (tournamentsResult.error) throw tournamentsResult.error

      const { totals, completed } = tournamentProgressByLeague(tournamentsResult.data)
      const formats = tournamentFormatsByLeague(tournamentsResult.data)
      const dateRanges = tournamentDateRangesByLeague(tournamentsResult.data)

      return leaguesResult.data.map(row => ({
        id: row.id,
        uuid: row.uuid,
        status: row.status as LeagueStatus,
        name: row.name,
        // starts_at is nullable at the DB level but every insert sets it
        // (see AddModal.vue) — created_at is only a fallback for rows
        // predating that, so EditModal.vue's date picker always has a value.
        startDate: row.starts_at ?? row.created_at,
        ruleset: row.ruleset?.name ?? null,
        rulesetUuid: row.ruleset_uuid,
        image: row.image_url,
        imageCardName: row.image_card_name,
        imageCardArtist: row.image_card_artist,
        tournamentCount: totals.get(row.uuid) ?? 0,
        completedTournamentCount: completed.get(row.uuid) ?? 0,
        tournamentFormats: [...(formats.get(row.uuid) ?? [])].sort(),
        tournamentDateRange: dateRanges.get(row.uuid) ?? null
      }))
    }
  })
}
