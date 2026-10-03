// app\composables\tournaments\pairing\useLiveCommanderStandings.ts
// Reactive standings recomputed from the tournament's current results/kills/votes, ported from
// league's useLiveStandings.ts but sourced from persisted (Pinia Colada) data instead of unsaved
// local store edits (no such store here, see CLAUDE.md's Pinia Colada + BFF convention). Every
// result/kill/vote mutation invalidates these queries, so it recomputes as soon as a save lands:
// "live" relative to the open round (before advance_commander_round persists into
// tournament_standings), not to an unsaved edit.
// The scoring itself is buildLiveCommanderStandings (utils/tournaments/liveCommanderStandings.ts).
export type { LiveCommanderStanding } from '~/utils/tournaments/liveCommanderStandings'

export function useLiveCommanderStandings(tournamentUuid: MaybeRefOrGetter<string>) {
  const { data: registrations } = useTournamentRegistrationsQuery(tournamentUuid)
  const { data: associatesData } = useAssociatesQuery()
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: resultsData } = useTournamentRoundResultsQuery(tournamentUuid)
  const { data: killsData } = useTournamentKillsQuery(tournamentUuid)
  const { data: votesData } = useTournamentVotesQuery(tournamentUuid)
  // fallow-ignore-next-line code-duplication -- same query wiring as the sibling
  const { data: rulesetPoints } = useRulesetPointsQuery(tournamentUuid)
  const dropByPlayerUuid = useDropInfoByPlayerUuid(tournamentUuid)

  const associateByUuid = computed(() =>
    new Map((associatesData.value ?? []).map(a => [a.uuid, a])))

  const liveStandings = computed(() => {
    const ruleset = rulesetPoints.value
    if (!ruleset) return []

    return buildLiveCommanderStandings({
      ruleset,
      registrations: registrations.value ?? [],
      associateByUuid: associateByUuid.value,
      pairings: pairings.value ?? [],
      results: resultsData.value ?? [],
      kills: killsData.value ?? [],
      votes: votesData.value ?? [],
      dropByPlayerUuid: dropByPlayerUuid.value
    })
  })

  return { liveStandings, dropByPlayerUuid }
}
