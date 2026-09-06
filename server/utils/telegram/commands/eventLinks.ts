// server\utils\telegram\commands\eventLinks.ts
import type { FormattedString } from '@grammyjs/parse-mode'

// Shared between tournament/detail.ts and eventi.ts — both build the same
// "maps link + Google Calendar link + capped photo caption" trio for a
// single item with a date/location, extracted 2026-09-06 after eventi.ts's
// event detail view duplicated all three almost byte-for-byte.

export interface MapsAddress {
  address: string | null
  postal_code: string | null
  city: string | null
  province: string | null
  country: string | null
  google_maps_url: string | null
}

// google_maps_url (precise place link) takes priority over a generic
// address search, same precedence as TournamentDetailContent.vue.
export function mapsUrl(location: MapsAddress): string | null {
  if (location.google_maps_url) return location.google_maps_url
  if (!location.address) return null
  const query = [
    location.address, location.postal_code, location.city, location.province, location.country
  ].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export interface CalendarEventInput {
  name: string
  startsAt: string
  endsAt: string | null
  locationName?: string | null
  description?: string | null
}

// Google Calendar's "render" endpoint accepts a prefilled event via query
// params — no auth, no backend of our own needed. Missing endsAt falls back
// to a 4-hour default block rather than omitting the button; better a rough
// estimate on the user's calendar than no calendar entry at all.
export function googleCalendarUrl(input: CalendarEventInput): string {
  const start = new Date(input.startsAt)
  const end = input.endsAt ? new Date(input.endsAt) : new Date(start.getTime() + 4 * 60 * 60 * 1000)
  const utcStamp = (date: Date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.name,
    dates: `${utcStamp(start)}/${utcStamp(end)}`
  })
  if (input.locationName) params.set('location', input.locationName)
  if (input.description) params.set('details', input.description)

  return `https://www.google.com/calendar/render?${params.toString()}`
}

// Telegram photo captions cap at 1024 characters (vs. 4096 for plain text
// messages) — only relevant when a detail is sent as a photo (image_url
// set). .slice() (not a raw string cut) keeps entities consistent with the
// truncated text.
const CAPTION_LIMIT = 1024

export function truncateForCaption(text: FormattedString): FormattedString {
  if (text.text.length <= CAPTION_LIMIT) return text
  return text.slice(0, CAPTION_LIMIT - 1).plain('…')
}
