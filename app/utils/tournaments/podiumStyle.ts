// app\utils\tournaments\podiumStyle.ts
// One podium look for a placement wherever it's shown (round report, round table cards):
// crown on gold for the winner, silver and bronze medals, a plain muted medal after (user request, 2026-10-02).
import { ICONS } from '~/utils/icons'

export interface PodiumStyle {
  icon: string
  // For a bare icon/text placement (ReportPlacement.vue).
  textClass: string
  // For a subtle UBadge (color="neutral" variant="subtle"), overriding its colors.
  badgeClass: string
}

const PODIUM: Record<1 | 2 | 3, PodiumStyle> = {
  1: {
    icon: ICONS.crown,
    textClass: 'text-warning',
    badgeClass: 'bg-warning/10 text-warning ring-warning/25'
  },
  2: {
    icon: ICONS.medal,
    textClass: 'text-slate-500 dark:text-slate-300',
    badgeClass: 'bg-slate-400/15 text-slate-600 ring-slate-400/40 dark:text-slate-300'
  },
  3: {
    icon: ICONS.medal,
    textClass: 'text-orange-700 dark:text-orange-400',
    badgeClass: 'bg-orange-700/10 text-orange-700 ring-orange-700/25 dark:text-orange-400'
  }
}

const OFF_PODIUM: PodiumStyle = {
  icon: ICONS.medal,
  textClass: 'text-muted',
  badgeClass: 'text-muted'
}

export function podiumStyle(position: number): PodiumStyle {
  return position === 1 || position === 2 || position === 3 ? PODIUM[position] : OFF_PODIUM
}
