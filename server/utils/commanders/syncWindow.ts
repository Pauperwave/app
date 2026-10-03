// server\utils\commanders\syncWindow.ts

// The commander catalog counts as complete up to its latest release date that is already past. A
// card spoiled with a future date (a set weeks away) must not push the sync window beyond cards
// that release sooner, so future dates never advance it.
export function newerPastDate(
  current: string | null,
  candidate: string,
  today: string
): string | null {
  if (candidate > today) return current
  return !current || candidate > current ? candidate : current
}

// Starts a bit before the latest release, in case Scryfall added a card with an older date after
// the previous sync
export function syncWindowStart(latestPastRelease: string, lookbackDays: number): string {
  const start = new Date(`${latestPastRelease}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - lookbackDays)
  return start.toISOString().slice(0, 10)
}
