// app\utils\tournaments\podiumStyle.ts
// One podium look for a placement wherever it's shown (round report, round table cards): a medal
// for everyone, gold/silver/bronze tints for the podium and a plain outline after it so 4th never
// reads like 2nd.
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
    icon: ICONS.medal,
    textClass: 'text-warning',
    badgeClass: 'bg-warning/10 text-warning ring-warning/30'
  },
  2: {
    icon: ICONS.medal,
    textClass: 'text-slate-500 dark:text-slate-300',
    badgeClass: 'bg-slate-500/15 text-slate-600 ring-slate-500/40 dark:text-slate-200 dark:bg-slate-300/15'
  },
  3: {
    icon: ICONS.medal,
    textClass: 'text-amber-800/80 dark:text-amber-600',
    badgeClass: 'bg-amber-800/5 text-amber-800/80 ring-amber-800/20 dark:text-amber-600 dark:ring-amber-600/25'
  }
}

const OFF_PODIUM: PodiumStyle = {
  icon: ICONS.medal,
  textClass: 'text-dimmed',
  badgeClass: 'bg-transparent text-dimmed ring-default'
}

export function podiumStyle(position: number): PodiumStyle {
  return position === 1 || position === 2 || position === 3 ? PODIUM[position] : OFF_PODIUM
}
