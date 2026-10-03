// app\utils\events\mapsUrl.ts

// Turns any Event/Tournament.location string into a Google Maps search link, so every card/detail
// address (CalendarCard.vue, CalendarDetailSlideover.vue) is tappable
export function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}
