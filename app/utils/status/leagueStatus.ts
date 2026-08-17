// app\utils\status\leagueStatus.ts
import type { LeagueStatus, StatusColor } from '~/types'

export const LEAGUE_STATUSES: LeagueStatus[] = ['draft', 'active', 'completed', 'cancelled']

export function leagueStatusColor(status: LeagueStatus): StatusColor {
  if (status === 'draft') return 'neutral'
  if (status === 'active') return 'info'
  if (status === 'completed') return 'success'
  return 'error'
}

export const LEAGUE_STATUS_ICONS: Record<LeagueStatus, string> = {
  draft: ICONS.edit,
  active: ICONS.pending,
  completed: ICONS.successFilledBig,
  cancelled: ICONS.clear
}
