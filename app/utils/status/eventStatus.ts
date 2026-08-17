// app\utils\status\eventStatus.ts
import type { EventStatus, StatusColor } from '~/types'

export const EVENT_STATUSES: EventStatus[] = ['draft', 'published', 'ongoing', 'completed', 'cancelled']

export function eventStatusColor(status: EventStatus): StatusColor {
  if (status === 'draft') return 'neutral'
  if (status === 'ongoing') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'error'
  return 'info'
}

export const EVENT_STATUS_ICONS: Record<EventStatus, string> = {
  draft: ICONS.edit,
  published: ICONS.clock,
  ongoing: ICONS.pending,
  completed: ICONS.successFilledBig,
  cancelled: ICONS.clear
}
