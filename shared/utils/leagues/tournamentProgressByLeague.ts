// shared\utils\leagues\tournamentProgressByLeague.ts

// Shared by useLeaguesQuery.ts and the Telegram bot's leghe.ts: counts a league's completed
// tournaments from a flat tournaments read. Cancelled ones are excluded from the denominator (5/5,
// not a permanent 5/6); un-cancelling one re-enters the count since live status is read on every
// call.

export interface LeagueTournamentRow {
  league_uuid: string | null
  status: string
}

export function tournamentProgressByLeague(tournaments: LeagueTournamentRow[]) {
  const totals = new Map<string, number>()
  const completed = new Map<string, number>()
  for (const row of tournaments) {
    if (!row.league_uuid || row.status === 'cancelled') continue
    totals.set(row.league_uuid, (totals.get(row.league_uuid) ?? 0) + 1)
    if (row.status === 'completed') {
      completed.set(row.league_uuid, (completed.get(row.league_uuid) ?? 0) + 1)
    }
  }
  return { totals, completed }
}
