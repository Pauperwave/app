// app\utils\events\eventIcs.ts

// Minimal single-VEVENT .ics file, enough for "add to calendar" — no
// recurrence, attendees, or timezone component, none of which apply here.
function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

// Escapes the characters RFC 5545 treats as special in TEXT values.
function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

// Structurally shared by Event and Tournament (see PublicCalendarPage.vue):
// most calendar items on /calendario are standalone tournaments, not
// events, so this isn't Event-specific — a "calendar item" prefix on the
// UID (not "event-") keeps ids unique across both kinds.
interface CalendarIcsItem {
  id: number
  name: string
  startDate: string
  location: string
}

export function downloadEventIcs(item: CalendarIcsItem) {
  const start = new Date(item.startDate)
  const now = new Date()

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PauperWave//Eventi//IT',
    'BEGIN:VEVENT',
    `UID:calendar-item-${item.id}@pauperwave.org`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `SUMMARY:${escapeIcsText(item.name)}`,
    `LOCATION:${escapeIcsText(item.location)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${item.name}.ics`
  link.click()

  URL.revokeObjectURL(url)
}
