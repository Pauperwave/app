// shared\utils\telegram\tournamentLink.ts

// The t.me start payload that opens one tournament's detail view in the bot: `torneo_<uuid>`. Telegram
// allows [A-Za-z0-9_-] up to 64 characters, which a prefix and a uuid (43) fit in.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const TOURNAMENT_LINK_PREFIX = 'torneo_'

export function tournamentLinkPayload(tournamentUuid: string): string {
  return `${TOURNAMENT_LINK_PREFIX}${tournamentUuid}`
}

export function isTournamentUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

// The tournament uuid in a payload, or null for anything that isn't one: a payload comes from a
// link anyone can edit
export function parseTournamentLinkPayload(payload: string): string | null {
  if (!payload.startsWith(TOURNAMENT_LINK_PREFIX)) return null

  const uuid = payload.slice(TOURNAMENT_LINK_PREFIX.length)
  return isTournamentUuid(uuid) ? uuid.toLowerCase() : null
}
