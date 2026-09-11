// server\utils\telegram\commands\tournaments\queries.ts

// Supabase queries shared across more than one command (calendario, leghe,
// iscrizioni, prossimo all need stage numbers/registration status).

// "Currently relevant" tournament statuses — shared by calendario.ts,
// prossimo.ts and iscrizioni.ts, previously duplicated under three
// different names in each. Excludes 'external' (shop-organized
// tournaments, see isExternalOrganizer in detail.ts) — bot schedule views
// stay Pauperwave-only.
export const OPEN_TOURNAMENT_STATUSES = ['registration_open', 'in_progress']

// Mirrors app/utils/tournaments/tournamentStageLabel.ts's
// assignTournamentStageNumbers: 1-based position within its league by start
// date, cancelled stages skipped. Needs each league's full history (not
// just the open/upcoming rows a caller already fetched), so this is a
// separate query rather than reusing a caller's own rows.
//
// leagueUuids scopes the scan to the league(s) the caller actually cares
// about — every call site knows this upfront (a specific league, a single
// tournament's own league, or the set of leagues appearing in a page of
// results). Omit it only when genuinely unknown; an unscoped call re-scans
// every league's entire history and gets more expensive as it grows.
export async function fetchStageNumbers(leagueUuids?: string[]): Promise<Map<string, number>> {
  if (leagueUuids?.length === 0) return new Map()

  const supabase = publicSupabaseClient()

  let query = supabase
    .from('tournaments')
    .select('uuid, league_uuid, starts_at, status')
    .is('deleted_at', null)
    .not('league_uuid', 'is', null)
  if (leagueUuids) query = query.in('league_uuid', leagueUuids)

  const { data, error } = await query.order('starts_at', { ascending: true })

  if (error) throw error

  const byLeague = new Map<string, { uuid: string, status: string }[]>()
  for (const row of data) {
    if (!row.league_uuid) continue
    const list = byLeague.get(row.league_uuid) ?? []
    list.push({ uuid: row.uuid, status: row.status })
    byLeague.set(row.league_uuid, list)
  }

  const stageNumbers = new Map<string, number>()
  for (const list of byLeague.values()) {
    let position = 0
    for (const row of list) {
      if (row.status === 'cancelled') continue
      position += 1
      stageNumbers.set(row.uuid, position)
    }
  }
  return stageNumbers
}

export type RegistrationStatus = 'registered' | 'checked_in' | null

export async function fetchRegistrationStatus(
  tournamentUuid: string, associateUuid: string
): Promise<RegistrationStatus> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('status, players!inner(associate_uuid)')
    .eq('tournament_uuid', tournamentUuid)
    .eq('players.associate_uuid', associateUuid)
    .maybeSingle()

  if (error) throw error
  return data?.status === 'checked_in' ? 'checked_in' : (data ? 'registered' : null)
}

// Batched variant of the above for a whole list of tournaments
// (calendario.ts's month view) — one query instead of one per tournament.
export async function fetchRegistrationStatuses(
  tournamentUuids: string[], associateUuid: string
): Promise<Map<string, RegistrationStatus>> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('tournament_uuid, status, players!inner(associate_uuid)')
    .in('tournament_uuid', tournamentUuids)
    .eq('players.associate_uuid', associateUuid)

  if (error) throw error

  const statuses = new Map<string, RegistrationStatus>()
  for (const row of data) {
    statuses.set(row.tournament_uuid, row.status === 'checked_in' ? 'checked_in' : 'registered')
  }
  return statuses
}
