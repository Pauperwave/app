// shared\utils\leagues\tournamentProgressByLeague.ts

// Shared by useLeaguesQuery.ts and the Telegram bot's leghe.ts (fallow
// dupes, 2026-09-03): both count "how many of a league's tournaments are
// completed" from a flat tournaments read. Cancelled tournaments are
// excluded from the denominator entirely (2026-08-16 user decision) — a
// cancelled tournament isn't "still to complete", so a league's progress
// reads e.g. 5/5 rather than a permanently-deflated 5/6. Un-cancelling one
// (status flipped back) re-enters the count automatically, since this reads
// live status on every call, not a stored snapshot.

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
