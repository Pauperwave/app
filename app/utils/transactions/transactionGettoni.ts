// app\utils\transactions\transactionGettoni.ts
// The 2026 historical import's Commanderwave Fest rows used the sheet's
// NOME EVENTO field to record a token count ("3 gettoni") instead of an
// actual event name — real event identity for those rows comes from
// event_uuid, not this text. Parsed here so the table can show it in its own
// "Gettoni" column instead of under "Evento" as if it were the event's name.
const GETTONI_PATTERN = /^(\d+)\s*getton[ei]$/i

export function parseGettoniCount(eventName: string | null): number | null {
  if (!eventName) return null
  const match = eventName.trim().match(GETTONI_PATTERN)
  return match?.[1] ? Number(match[1]) : null
}
