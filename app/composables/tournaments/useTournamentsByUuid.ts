// app\composables\tournaments\useTournamentsByUuid.ts

// The tournaments of the shared 'tournaments' Pinia Colada key (the same fetch /tournaments uses,
// with the league-relative stageNumber already assigned), keyed by uuid for the pages that
// attribute a transaction to its tournament
export function useTournamentsByUuid() {
  const { data: tournaments } = useTournamentsQuery()
  return computed(() =>
    new Map((tournaments.value ?? []).map(tournament => [tournament.uuid, tournament])))
}
