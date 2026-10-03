// app\utils\tournaments\tablePlayerStanding.ts
// Standing summaries under each player in the round 2+ table previews, so the organizer sees why
// the tables came out this way
import type { TablePlayerStanding } from '~/types'
import { ICONS } from '~/utils/icons'
import type { SwissStandingStats } from '~/utils/tournaments/swissScoring'

function formatPercentage(value: number): string {
  return (value * 100).toFixed(1)
}

// Same columns and tiebreak order as SwissStandingsTable.vue: points, then OMW%, GW%, OGW%.
export function swissTablePlayerStanding(
  stats: SwissStandingStats,
  rank: number
): TablePlayerStanding {
  return {
    rank,
    points: stats.matchPoints,
    record: `${stats.wins}-${stats.draws}-${stats.losses}`,
    tiebreakers: [
      { label: 'OMW%', value: formatPercentage(stats.omw) },
      { label: 'GW%', value: formatPercentage(stats.gw) },
      { label: 'OGW%', value: formatPercentage(stats.ogw) }
    ]
  }
}

interface CommanderStats {
  score: number
  victories: number
  kills: number
  brewReceived: number
  playReceived: number
}

// Same tiebreak order as compareCommanderStandings: score, then victories, kills, brew and play
// votes. Shown as icons, same as CommanderStandingsTable.vue's column headers.
export function commanderTablePlayerStanding(
  stats: CommanderStats,
  rank: number,
  labels: { victories: string, kills: string, brew: string, play: string }
): TablePlayerStanding {
  return {
    rank,
    points: stats.score,
    tiebreakers: [
      { label: labels.victories, value: String(stats.victories), icon: ICONS.standings },
      { label: labels.kills, value: String(stats.kills), icon: ICONS.kills },
      { label: labels.brew, value: String(stats.brewReceived), icon: ICONS.brewVotes },
      { label: labels.play, value: String(stats.playReceived), icon: ICONS.playVotes }
    ]
  }
}
