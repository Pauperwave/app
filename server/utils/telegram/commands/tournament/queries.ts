// server\utils\telegram\commands\tournament\queries.ts

// Supabase queries shared across more than one command (calendario, leghe,
// iscrizioni, prossimo all need stage numbers/registration status).

// Mirrors app/utils/tournaments/tournamentStageLabel.ts's
// assignTournamentStageNumbers: 1-based position within its league by start
// date, cancelled stages skipped. Needs the league's full history, so this
// is a separate lightweight query rather than reusing a caller's own rows.
export async function fetchStageNumbers(): Promise<Map<string, number>> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('uuid, league_uuid, starts_at, status')
    .is('deleted_at', null)
    .not('league_uuid', 'is', null)
    .order('starts_at', { ascending: true })

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

// Batched variant of the above for a whole list of tournaments (leghe.ts's
// per-league view) — one query instead of one per tournament.
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
