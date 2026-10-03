// app\utils\status\wantedCardStatus.ts
import type { StatusColor, WantedCardStatus } from '~/types'

export const WANTED_CARD_STATUSES: WantedCardStatus[] = ['searching', 'found', 'abandoned']

/** searching=in progress (warning), found=resolved successfully (success),
 * abandoned=closed without an outcome (neutral — not an error, just "gave up"). */
export function wantedCardStatusColor(status: WantedCardStatus): StatusColor {
  if (status === 'found') return 'success'
  if (status === 'abandoned') return 'neutral'
  return 'warning'
}

/**
 * For compact views (grid): the badge becomes icon-only with the label in the tooltip, since
 * "Abbandonata" wrapped the ~200px card footer. Views with room (table) keep the textual badge.
 */
export const WANTED_CARD_STATUS_ICONS: Record<WantedCardStatus, string> = {
  searching: ICONS.search,
  found: ICONS.success,
  abandoned: ICONS.banned
}
