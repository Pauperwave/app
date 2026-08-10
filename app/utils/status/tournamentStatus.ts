// app\utils\status\tournamentStatus.ts
import type { TournamentStatus } from '~/types'

export const TOURNAMENT_STATUSES: TournamentStatus[] = ['scheduled', 'ongoing', 'completed', 'canceled']

export function tournamentStatusColor(status: TournamentStatus): 'info' | 'warning' | 'success' | 'error' {
  if (status === 'ongoing') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'canceled') return 'error'
  return 'info'
}

export const TOURNAMENT_STATUS_ICONS: Record<TournamentStatus, string> = {
  scheduled: 'i-lucide-clock',
  ongoing: 'i-lucide-circle-dot-dashed',
  completed: 'i-lucide-circle-check-big',
  canceled: 'i-lucide-circle-x'
}
