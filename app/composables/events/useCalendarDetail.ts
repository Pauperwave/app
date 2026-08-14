// app\composables\events\useCalendarDetail.ts
import type { Event, Tournament } from '~/types'

// Shared by CalendarCard.vue (writer, via CalendarEventCard.vue /
// CalendarTournamentCard.vue) and CalendarDetailSlideover.vue (reader) on
// /calendario — tapping a card opens its detail in a right-side slideover
// instead of navigating to a new page (user request 2026-08-14). useState,
// not a plain ref, so it stays a single shared instance across the two
// components without prop/emit threading through CalendarCard.vue, which
// doesn't otherwise need to know about Event/Tournament shapes.
type CalendarDetailSelection
  = | { kind: 'event', event: Event, tournaments: Tournament[] }
    | { kind: 'tournament', tournament: Tournament }

export function useCalendarDetail() {
  return useState<CalendarDetailSelection | null>('calendar-detail-selection', () => null)
}
