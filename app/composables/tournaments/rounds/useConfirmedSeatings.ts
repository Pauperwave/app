// app\composables\tournaments\rounds\useConfirmedSeatings.ts
// The last confirmed seating of every round, still held after a turn-back deletes that round, so the table
// preview reopens on the approved tables (and round 1's seed) instead of a fresh draw (user request, 2026-10-02).
// Lives for the page only: a reload after the turn-back finds the round gone and starts over.
export interface ConfirmedSeating {
  seed: number | null
  // Associate uuids per table, in table order, each table in seat order.
  tables: string[][]
}

// A saved seating is only reused when it seats exactly these players; anyone added or removed starts over.
export function seatingMatchesPlayers(seating: ConfirmedSeating, playerIds: string[]): boolean {
  const sortedIds = (ids: string[]) => [...ids].sort().join(',')
  return sortedIds(seating.tables.flat()) === sortedIds(playerIds)
}

interface Snapshot {
  seating: ConfirmedSeating
  // Round N's tables only make sense on top of the round N-1 they were drawn after.
  previousRoundUuid: string | null
}

export function useConfirmedSeatings(tournamentUuid: MaybeRefOrGetter<string>) {
  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)

  const snapshots = ref<Record<number, Snapshot>>({})

  function roundUuidAt(roundNumber: number): string | null {
    return rounds.value?.find(round => round.roundNumber === roundNumber)?.uuid ?? null
  }

  // Only ever overwritten while a round exists, so deleting it leaves its last snapshot in place.
  watchEffect(() => {
    const associateByPlayer = new Map((registrations.value ?? [])
      .map(registration => [registration.playerUuid, registration.associateUuid]))

    for (const round of rounds.value ?? []) {
      const tables = (pairings.value ?? [])
        .filter(pairing => pairing.roundUuid === round.uuid)
        // A 1v1 bye has no table number: it stays last, as the preview seats it.
        .sort((a, b) => (a.tableNumber ?? Infinity) - (b.tableNumber ?? Infinity))
        .map(pairing => pairing.playerUuids
          .map(playerUuid => associateByPlayer.get(playerUuid))
          .filter((uuid): uuid is string => uuid !== undefined))

      if (!tables.length) continue
      snapshots.value[round.roundNumber] = {
        seating: { seed: round.shuffleSeed, tables },
        previousRoundUuid: roundUuidAt(round.roundNumber - 1)
      }
    }
  })

  // Dropped once the round before it was redone (new uuid): those tables were drawn on other results.
  function seatingFor(roundNumber: number): ConfirmedSeating | null {
    const snapshot = snapshots.value[roundNumber]
    if (!snapshot) return null
    return snapshot.previousRoundUuid === roundUuidAt(roundNumber - 1) ? snapshot.seating : null
  }

  return { seatingFor }
}
