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
// UID (not "event-") keeps ids unique across both kinds. endDate is
// optional since Event has no end time (only Tournament does) — falls back
// to a 2-hour default below when missing. Exported since
// AddToCalendarButton.vue's prop needs the same shape.
export interface CalendarIcsItem {
  id: number
  name: string
  startDate: string
  endDate?: string | null
  location: string | null
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
    `LOCATION:${escapeIcsText(item.location ?? '')}`,
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

// Desktop alternative to the .ics download above (AddToCalendarButton.vue
// picks between the two via useDevice().isMobile) — a downloaded file is
// more friction than it's worth on desktop (has to be opened/imported
// manually), where a one-click web link is the native "add to calendar"
// path instead. Mobile keeps the .ics download since iOS/Android both
// import it straight into the system calendar app.
export function googleCalendarUrl(item: CalendarIcsItem): string {
  const start = new Date(item.startDate)
  const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 2 * 3600000)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.name,
    dates: `${toIcsDate(start)}/${toIcsDate(end)}`,
    location: item.location ?? ''
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
