// app\utils\status\tournamentStatus.ts
import type { StatusColor, TournamentStatus } from '~/types'

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'draft', 'registration_open', 'in_progress', 'completed', 'cancelled'
]

export function tournamentStatusColor(status: TournamentStatus): StatusColor {
  if (status === 'draft') return 'neutral'
  if (status === 'in_progress') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'error'
  return 'info'
}

// Same status -> color mapping as tournamentStatusColor(), spelled out as
// literal Tailwind bg-* classes instead of a UBadge `color` prop — for
// contexts drawing a plain colored cell (CalendarHeatmap's variantByDate),
// not a badge.
export function tournamentStatusBgClass(status: TournamentStatus): string {
  // Not bg-neutral — that class doesn't resolve to a real color in this
  // theme (renders fully transparent, confirmed via claude-in-chrome:
  // getComputedStyle returned rgba(0,0,0,0)). bg-accented alone was also too
  // close to the empty-cell bg-elevated (oklch 0.37 vs 0.274 — barely
  // distinguishable at a 12px swatch size, user feedback 2026-08-20). A
  // border reads more clearly than a subtle fill difference at that size.
  if (status === 'draft') return 'bg-elevated border-2 border-accented'
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
  cancelled: ICONS.clear
}
