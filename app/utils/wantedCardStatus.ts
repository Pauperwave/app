// app\utils\wantedCardStatus.ts
import type { WantedCardStatus } from '~/types'

export const WANTED_CARD_STATUSES: WantedCardStatus[] = ['searching', 'found', 'abandoned']

/** searching=in progress (warning), found=resolved successfully (success),
 * abandoned=closed without an outcome (neutral — not an error, just "gave up"). */
export function wantedCardStatusColor(status: WantedCardStatus): 'warning' | 'success' | 'neutral' {
  if (status === 'found') return 'success'
  if (status === 'abandoned') return 'neutral'
  return 'warning'
}

/** For compact views (grid): the status badge becomes icon-only with the label in
 * the tooltip. "Abbandonata" is the longest of the three labels and wrapped the
 * card footer, which is ~200px wide. In views with room (table) the badge stays
 * textual. */
export const WANTED_CARD_STATUS_ICONS: Record<WantedCardStatus, string> = {
  searching: 'i-lucide-search',
  found: 'i-lucide-check-circle',
  abandoned: 'i-lucide-ban'
}
