// shared\utils\tournaments\capacity.ts

// A no-show gives their place back: they don't count against a tournament's player cap
// (tournaments.max_entrants)
export const NO_SHOW_STATUS = 'no_show'

interface RegistrationRow {
  tournament_uuid: string
  status: string
}

// Places taken per tournament, from its registrations
export function countTakenSeats(rows: RegistrationRow[]): Map<string, number> {
  const taken = new Map<string, number>()

  for (const row of rows) {
    if (row.status === NO_SHOW_STATUS) continue
    taken.set(row.tournament_uuid, (taken.get(row.tournament_uuid) ?? 0) + 1)
  }

  return taken
}

// No cap, no "full"
export function isTournamentFull(
  maxEntrants: number | null | undefined,
  takenSeats: number
): boolean {
  return !!maxEntrants && takenSeats >= maxEntrants
}
