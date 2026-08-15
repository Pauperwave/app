// app\utils\status\tournamentStatus.ts
import type { TournamentStatus } from '~/types'

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'draft', 'registration_open', 'in_progress', 'completed', 'cancelled'
]

export function tournamentStatusColor(status: TournamentStatus): 'neutral' | 'info' | 'warning' | 'success' | 'error' {
  if (status === 'draft') return 'neutral'
  if (status === 'in_progress') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'error'
  return 'info'
}

export const TOURNAMENT_STATUS_ICONS: Record<TournamentStatus, string> = {
  draft: ICONS.edit,
  registration_open: ICONS.clock,
  in_progress: ICONS.pending,
  completed: ICONS.successFilledBig,
  cancelled: ICONS.clear
}
