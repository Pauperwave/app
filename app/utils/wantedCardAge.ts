// app\utils\wantedCardAge.ts
import { differenceInCalendarDays, formatDistanceToNow, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export type WantedCardAgeColor = 'success' | 'warning' | 'error'

export interface WantedCardAgeInfo {
  label: string
  color: WantedCardAgeColor
}

const WARNING_THRESHOLD_DAYS = 30
const ERROR_THRESHOLD_DAYS = 90

// Fasce su "da quanto è aperta la richiesta" invece della data grezza: sotto
// i 30gg nessuna urgenza, 30-90gg vale un controllo, oltre i 90gg è
// candidata a un follow-up (o a "Segna come abbandonata").
export function wantedCardAgeInfo(dateString: string): WantedCardAgeInfo | null {
  if (!dateString) return null

  let date: Date
  try {
    date = parseISO(dateString)
  } catch {
    return null
  }

  const days = differenceInCalendarDays(new Date(), date)
  const color: WantedCardAgeColor = days >= ERROR_THRESHOLD_DAYS
    ? 'error'
    : days >= WARNING_THRESHOLD_DAYS ? 'warning' : 'success'

  return {
    label: formatDistanceToNow(date, { addSuffix: true, locale: it }),
    color
  }
}
