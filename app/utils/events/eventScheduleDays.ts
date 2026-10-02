// app\utils\events\eventScheduleDays.ts
// Which days an event's calendar shows (user request, 2026-10-02): every day the event spans plus
// every day one of its tournaments starts on, so a tournament outside the event's own dates is
// never hidden. Local "YYYY-MM-DD" keys (toLocalDateKey), sorted.

// An end exactly at midnight belongs to the evening before (20:00 -> 00:00 is a one-day event).
function lastDayOf(end: Date): Date {
  const isMidnight = end.getHours() === 0 && end.getMinutes() === 0
  return isMidnight ? new Date(end.getTime() - 1) : end
}

// Long multi-day spans are capped: the calendar is a day/week view, not a month.
const MAX_SPAN_DAYS = 14

export function eventScheduleDays(
  event: { startDate: string, endDate: string | null },
  tournaments: { startDate: string }[]
): string[] {
  const days = new Set<string>()

  const start = new Date(event.startDate)
  const end = event.endDate ? lastDayOf(new Date(event.endDate)) : start
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  for (let i = 0; i < MAX_SPAN_DAYS && cursor <= end; i++) {
    days.add(toLocalDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const tournament of tournaments) days.add(toLocalDateKey(new Date(tournament.startDate)))

  return [...days].sort()
}
