// app\utils\events\mapsUrl.ts

// Turns any Event/Tournament.location string into a Google Maps search link
// — used wherever the location line appears (CalendarCard.vue,
// CalendarDetailSlideover.vue) so every card/detail's address is tappable,
// not just the one with a real address (Smart Lab, added 2026-08-14).
export function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}
