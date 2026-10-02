// app\composables\tournaments\rounds\useLastRoundOneSeating.ts
// The last confirmed round-1 seating, still held after "Torna alle iscrizioni" deletes round 1, so the
// table preview can reopen on the approved tables and their seed (user request, 2026-10-02).
// Lives for the page only: a reload after the turn-back finds no round 1 left and starts from a fresh shuffle.
export interface ConfirmedSeating {
  seed: number | null
  // Associate uuids per table, in table order.
  tables: string[][]
}

export function useLastRoundOneSeating(tournamentUuid: MaybeRefOrGetter<string>) {
  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)

  const seating = ref<ConfirmedSeating | null>(null)

  // Only ever overwritten while round 1 exists, so the deletion itself leaves the last snapshot in place.
  watchEffect(() => {
    const roundOne = rounds.value?.find(round => round.roundNumber === 1)
    if (!roundOne) return

    const associateByPlayer = new Map((registrations.value ?? [])
      .map(registration => [registration.playerUuid, registration.associateUuid]))

    const tables = (pairings.value ?? [])
      .filter(pairing => pairing.roundUuid === roundOne.uuid)
      .sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0))
      .map(pairing => pairing.playerUuids
        .map(playerUuid => associateByPlayer.get(playerUuid))
        .filter((uuid): uuid is string => uuid !== undefined))

    if (!tables.length) return
    seating.value = { seed: roundOne.shuffleSeed, tables }
  })

  return seating
}
