// app\utils\status\tournamentStatus.ts
import type { StatusColor, TournamentStatus } from '~/types'

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'draft', 'registration_open', 'in_progress', 'completed', 'cancelled'
]

export function tournamentStatusColor(status: TournamentStatus): StatusColor {
  if (status === 'draft' || status === 'external') return 'neutral'
  if (status === 'in_progress') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'error'
  return 'info'
}

// Same status -> color mapping as tournamentStatusColor() as literal Tailwind bg-* classes, for
// plain colored cells (CalendarHeatmap's variantByDate) rather than a UBadge `color` prop
export function tournamentStatusBgClass(status: TournamentStatus): string {
  // Not bg-neutral (renders transparent in this theme), and bg-accented alone is too close to the
  // empty-cell bg-elevated at a 12px swatch: a border reads more clearly than a subtle fill
  // difference
  if (status === 'draft' || status === 'external') return 'bg-elevated border-2 border-accented'
  if (status === 'in_progress') return 'bg-warning'
  if (status === 'completed') return 'bg-success'
  if (status === 'cancelled') return 'bg-error'
  return 'bg-info'
}

export const TOURNAMENT_STATUS_ICONS: Record<TournamentStatus, string> = {
  draft: ICONS.edit,
  registration_open: ICONS.clock,
  in_progress: ICONS.pending,
  completed: ICONS.successFilledBig,
  cancelled: ICONS.clear,
  external: ICONS.externalLink
}
