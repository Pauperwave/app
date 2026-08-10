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
  scheduled: 'i-lucide-clock',
  ongoing: 'i-lucide-circle-dot-dashed',
  completed: 'i-lucide-circle-check-big',
  canceled: 'i-lucide-circle-x'
}
