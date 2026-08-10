// app\utils\wantedCards\wantedCardAge.ts
import { differenceInCalendarDays, formatDistanceToNow, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export type WantedCardAgeColor = 'success' | 'warning' | 'error'

export interface WantedCardAgeInfo {
  label: string
  color: WantedCardAgeColor
}

const WARNING_THRESHOLD_DAYS = 30
const ERROR_THRESHOLD_DAYS = 90

// Bands on "how long the request has been open" instead of the raw date: under 30
// days no urgency, 30-90 days worth a check, past 90 days it is a candidate for a
// follow-up (or for "Mark as abandoned").
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
