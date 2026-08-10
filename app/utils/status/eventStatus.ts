// app\utils\status\eventStatus.ts
import type { EventStatus } from '~/types'

export const EVENT_STATUSES: EventStatus[] = ['scheduled', 'ongoing', 'completed', 'canceled']

export function eventStatusColor(status: EventStatus): 'info' | 'warning' | 'success' | 'error' {
  if (status === 'ongoing') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'canceled') return 'error'
  return 'info'
}

export const EVENT_STATUS_ICONS: Record<EventStatus, string> = {
  scheduled: ICONS.clock,
  ongoing: ICONS.pending,
  completed: ICONS.successFilledBig,
  canceled: ICONS.clear
}
