// server\utils\mockPlacements.ts

// Shared by server/api/cittadino.ts and server/api/standings/[format].get.ts
// (fallow dupes, 2026-08-12): both mock which players "show up" to an event —
// filtered by a per-player regularity probability, then Fisher-Yates shuffled
// into a final placement order.

export function createRng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

interface MockPlayer {
  uuid: string
  name: string
  regularity: number
}

// `regularityRange` is [min, spread] — regularity is `min + rng() * spread`,
// i.e. each player's chance of showing up at any given event.
export function buildMockPlayers(
  count: number,
  uuidPrefix: string,
  firstNames: string[],
  lastNames: string[],
  rng: () => number,
  regularityRange: [min: number, spread: number]
): MockPlayer[] {
  const [min, spread] = regularityRange
  return Array.from({ length: count }, (_, i) => ({
    uuid: `${uuidPrefix}${(i + 1).toString().padStart(2, '0')}`,
    name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
    regularity: min + rng() * spread
  }))
}

interface MockPlacementRow {
  player_uuid: string
  player_name: string
  event_uuid: string
  rank: number
}

export function buildEventPlacements(
  players: MockPlayer[],
  eventUuid: string,
  rng: () => number
): MockPlacementRow[] {
  const attendees = players.filter(player => rng() < player.regularity)

  for (let i = attendees.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[attendees[i], attendees[j]] = [attendees[j]!, attendees[i]!]
  }

  return attendees.map((player, index) => ({
    player_uuid: player.uuid,
    player_name: player.name,
    event_uuid: eventUuid,
    rank: index + 1
  }))
}
