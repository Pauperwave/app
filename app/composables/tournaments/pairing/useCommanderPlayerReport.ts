// app\composables\tournaments\pairing\useCommanderPlayerReport.ts
// The data behind a player's "pagella": per round, the placement, kills and votes and what each was
// worth (buildCommanderPlayerReport, the same numbers as the standings), plus the deck used there.
import { buildCommanderPlayerReport } from '#shared/utils/tournaments/commanderPlayerReport'
import type { PlayerReportRound } from '#shared/utils/tournaments/commanderPlayerReport'
import type { CommanderDeckNames } from '~/composables/tournaments/rounds/useCommanderDecksByUuidsQuery'
import type { LiveCommanderStanding } from './useLiveCommanderStandings'

export type ReportRoundWithDeck = PlayerReportRound & {
  /** The commanders of the deck used that round, once loaded. */
  deck?: CommanderDeckNames
}

export function useCommanderPlayerReport(
  tournamentUuid: MaybeRefOrGetter<string>,
  player: MaybeRefOrGetter<LiveCommanderStanding | null>
) {
  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const { data: pairings } = useTournamentPairingsQuery(tournamentUuid)
  const { data: results } = useTournamentRoundResultsQuery(tournamentUuid)
  const { data: kills } = useTournamentKillsQuery(tournamentUuid)
  const { data: votes } = useTournamentVotesQuery(tournamentUuid)
  const { data: ruleset } = useRulesetPointsQuery(tournamentUuid)

  const reportRounds = computed(() => {
    const current = toValue(player)
    if (!current || !ruleset.value) return []
    return buildCommanderPlayerReport({
      playerUuid: current.playerUuid,
      rounds: rounds.value ?? [],
      pairings: pairings.value ?? [],
      results: results.value ?? [],
      kills: kills.value ?? [],
      votes: votes.value ?? [],
      ruleset: ruleset.value
    })
  })

  const deckUuids = computed(() => reportRounds.value
    .flatMap(reportRound => reportRound.commanderDeckUuid ?? []))
  const { data: decks } = useCommanderDecksByUuidsQuery(deckUuids)

  const roundsWithDeck = computed<ReportRoundWithDeck[]>(() => reportRounds.value
    .map(reportRound => ({
      ...reportRound,
      deck: reportRound.commanderDeckUuid
        ? decks.value?.get(reportRound.commanderDeckUuid)
        : undefined
    })))

  return { roundsWithDeck }
}
