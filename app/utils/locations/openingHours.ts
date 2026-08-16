// app\utils\locations\openingHours.ts
import type { DayOfWeek, OpeningHours } from '~/types'

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]

export function emptyOpeningHours(): OpeningHours {
  return Object.fromEntries(DAYS_OF_WEEK.map(day => [day, null])) as OpeningHours
}
