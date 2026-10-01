// app\composables\tournaments\prizes\useTournamentAwards.ts
// Ported from MagicTheGathering/league's useTournamentAwards.ts (user
// request 2026-09-16: build the Awards.vue placeholder for real). Adapted
// to LiveCommanderStanding's own fields instead of a separate
// standings+victimCounts pair — this app's useLiveCommanderStandings.ts
// already folds "times killed" into the same standing row (see its own
// `deaths` field comment). Tiebreaks and ex aequo: ADR-052, docs/PROGRESS.md.
import type { LiveCommanderStanding } from '../pairing/useLiveCommanderStandings'

export type TournamentAwardKind = 'victim' | 'killer' | 'brewer' | 'player'

export type TournamentTiebreakId
  = 'deaths' | 'kills' | 'killsPerRound' | 'deathsPerRound' | 'rounds' | 'voters'

export interface TournamentTiebreakValue {
  id: TournamentTiebreakId
  /** As shown to the user (a plain count, or a rate for the per-round ones). */
  value: number
}

export interface TournamentAwardRankingEntry {
  /** 1-based, players still tied after every tiebreak share the same position. */
  position: number
  /** More than one player holds this position. */
  isTied: boolean
  playerUuid: string
  associateUuid: string
  firstName: string
  surname: string
  value: number
  /** The tiebreaks of this award in the order they apply, shown under the name. */
  tiebreaks: TournamentTiebreakValue[]
}

export interface TournamentAward {
  kind: TournamentAwardKind
  /** Everyone in first position: more than one only for a true ex aequo. */
  winners: TournamentAwardRankingEntry[]
  /** Everyone with a score above 0 for this stat, best first (user request, 2026-10-02). */
  ranking: TournamentAwardRankingEntry[]
}

interface Tiebreak {
  id: TournamentTiebreakId
  /** What gets shown. */
  display: (standing: LiveCommanderStanding) => number
  /** Higher is better, may differ from the shown number (fewer deaths is better). */
  rank: (standing: LiveCommanderStanding) => number
}

function perRound(count: number, standing: LiveCommanderStanding) {
  return standing.roundsPlayed > 0 ? count / standing.roundsPlayed : 0
}

const FEWER_DEATHS: Tiebreak = {
  id: 'deaths', display: s => s.deaths, rank: s => -s.deaths
}
const FEWER_KILLS: Tiebreak = {
  id: 'kills', display: s => s.kills, rank: s => -s.kills
}
const KILLS_PER_ROUND: Tiebreak = {
  id: 'killsPerRound', display: s => perRound(s.kills, s), rank: s => perRound(s.kills, s)
}
const DEATHS_PER_ROUND: Tiebreak = {
  id: 'deathsPerRound', display: s => perRound(s.deaths, s), rank: s => perRound(s.deaths, s)
}

/**
 * End-of-tournament "highlight" awards shown alongside the final standings:
 * most-killed ("La Vittima"), most kills dealt ("Il Carnefice"), best
 * brew-vote score ("Master Brewer"), best play-vote count ("Il Player").
 * Each is the highest scorer for its stat, then ties are broken by what the stat means (not by
 * the overall score): fewer deaths then kills per round for the killer, fewer kills then deaths
 * per round for the victim, votes from more rounds then from more different voters for the two
 * vote awards. Whoever is still level shares the position (ex aequo), nobody is picked at
 * random. An award is omitted entirely when its stat is 0 for everyone (e.g. a tournament with
 * no kills logged yet), rather than crowning an arbitrary 0.
 */
export function useTournamentAwards(standings: Ref<LiveCommanderStanding[]>) {
  return computed<TournamentAward[]>(() => {
    const pick = (
      kind: TournamentAwardKind,
      getValue: (standing: LiveCommanderStanding) => number,
      tiebreaks: Tiebreak[]
    ): TournamentAward | null => {
      const keysOf = (standing: LiveCommanderStanding) =>
        [getValue(standing), ...tiebreaks.map(tiebreak => tiebreak.rank(standing))]
      const isSameRank = (a: LiveCommanderStanding, b: LiveCommanderStanding) => {
        const keysB = keysOf(b)
        return keysOf(a).every((key, index) => key === keysB[index])
      }

      // Array.sort is stable, so players left level keep the order of `standings`.
      const scorers = standings.value
        .filter(standing => getValue(standing) > 0)
        .sort((a, b) => {
          const keysA = keysOf(a)
          const keysB = keysOf(b)
          const index = keysA.findIndex((key, position) => key !== keysB[position])
          return index === -1 ? 0 : (keysB[index] ?? 0) - (keysA[index] ?? 0)
        })

      const ranking = scorers.map((standing): TournamentAwardRankingEntry => ({
        position: scorers.findIndex(other => isSameRank(other, standing)) + 1,
        isTied: scorers.filter(other => isSameRank(other, standing)).length > 1,
        playerUuid: standing.playerUuid,
        associateUuid: standing.associateUuid,
        firstName: standing.firstName,
        surname: standing.surname,
        value: getValue(standing),
        tiebreaks: tiebreaks.map(tiebreak => ({
          id: tiebreak.id,
          value: tiebreak.display(standing)
        }))
      }))

      const winners = ranking.filter(entry => entry.position === 1)
      return winners.length > 0 ? { kind, winners, ranking } : null
    }

    const brewTiebreaks: Tiebreak[] = [
      { id: 'rounds', display: s => s.brewRounds, rank: s => s.brewRounds },
      { id: 'voters', display: s => s.brewVoters, rank: s => s.brewVoters }
    ]
    const playTiebreaks: Tiebreak[] = [
      { id: 'rounds', display: s => s.playRounds, rank: s => s.playRounds },
      { id: 'voters', display: s => s.playVoters, rank: s => s.playVoters }
    ]

    return [
      pick('victim', s => s.deaths, [FEWER_KILLS, DEATHS_PER_ROUND]),
      pick('killer', s => s.kills, [FEWER_DEATHS, KILLS_PER_ROUND]),
      pick('brewer', s => s.brewReceived, brewTiebreaks),
      pick('player', s => s.playReceived, playTiebreaks)
    ].filter((award): award is TournamentAward => award !== null)
  })
}
