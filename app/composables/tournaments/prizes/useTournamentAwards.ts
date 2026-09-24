// app\composables\tournaments\prizes\useTournamentAwards.ts
// Ported from MagicTheGathering/league's useTournamentAwards.ts (user
// request 2026-09-16: build the Awards.vue placeholder for real). Adapted
// to LiveCommanderStanding's own fields instead of a separate
// standings+victimCounts pair — this app's useLiveCommanderStandings.ts
// already folds "times killed" into the same standing row (see its own
// `deaths` field comment).
import type { LiveCommanderStanding } from '../pairing/useLiveCommanderStandings'

export type TournamentAwardKind = 'victim' | 'killer' | 'brewer' | 'player'

export interface TournamentAward {
  kind: TournamentAwardKind
  playerUuid: string
  associateUuid: string
  label: string
  firstName: string
  surname: string
  value: number
}

/**
 * End-of-tournament "highlight" awards shown alongside the final standings:
 * most-killed ("La Vittima"), most kills dealt ("Il Carnefice"), best
 * brew-vote score ("Master Brewer"), best play-vote count ("Il Player").
 * Each is the single highest scorer for its stat — ties are broken by
 * whichever player sorts first in `standings`. An award is omitted entirely
 * when its stat is 0 for everyone (e.g. a tournament with no kills logged
 * yet), rather than crowning an arbitrary 0.
 */
export function useTournamentAwards(standings: Ref<LiveCommanderStanding[]>) {
  return computed<TournamentAward[]>(() => {
    const pick = (
      kind: TournamentAwardKind,
      getValue: (standing: LiveCommanderStanding) => number
    ): TournamentAward | null => {
      let best: TournamentAward | null = null
      for (const standing of standings.value) {
        const value = getValue(standing)
        if (value <= 0 || (best && value <= best.value)) continue
        best = {
          kind,
          playerUuid: standing.playerUuid,
          associateUuid: standing.associateUuid,
          label: standing.label,
          firstName: standing.firstName,
          surname: standing.surname,
          value
        }
      }
      return best
    }

    return [
      pick('victim', s => s.deaths),
      pick('killer', s => s.kills),
      pick('brewer', s => s.brewReceived),
      pick('player', s => s.playReceived)
    ].filter((award): award is TournamentAward => award !== null)
  })
}
