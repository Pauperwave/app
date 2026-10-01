// app\utils\tournaments\tournamentAwardIcons.ts
// Same icons as the standings table headers (CommanderStandingsTable.vue), so a stat reads the
// same in every ranking.
import type { TournamentAwardKind } from '~/composables/tournaments/prizes/useTournamentAwards'

export const TOURNAMENT_AWARD_ICONS: Record<TournamentAwardKind, string> = {
  victim: ICONS.deaths,
  killer: ICONS.kills,
  brewer: ICONS.brewVotes,
  player: ICONS.playVotes
}
