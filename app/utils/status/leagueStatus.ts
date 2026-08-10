// app\utils\status\leagueStatus.ts
import type { LeagueStatus } from '~/types'

export const LEAGUE_STATUSES: LeagueStatus[] = ['scheduled', 'ongoing', 'completed']

export function leagueStatusColor(status: LeagueStatus): 'info' | 'warning' | 'success' {
  if (status === 'ongoing') return 'warning'
  if (status === 'completed') return 'success'
  return 'info'
}

export const LEAGUE_STATUS_ICONS: Record<LeagueStatus, string> = {
  scheduled: ICONS.clock,
  ongoing: ICONS.pending,
  completed: ICONS.successFilledBig
}
