// app\utils\transactions\transactionGettoni.ts
// The 2026 historical import's Commanderwave Fest rows stored a token count ("3 gettoni") in the
// sheet's NOME EVENTO field instead of an event name (the real event comes from event_uuid). Parsed
// here to show it in its own "Gettoni" column, not under "Evento"
const GETTONI_PATTERN = /^(\d+)\s*getton[ei]$/i

export function parseGettoniCount(eventName: string | null): number | null {
  if (!eventName) return null
  const match = eventName.trim().match(GETTONI_PATTERN)
  return match?.[1] ? Number(match[1]) : null
}
