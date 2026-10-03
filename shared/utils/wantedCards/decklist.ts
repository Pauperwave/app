// shared\utils\wantedCards\decklist.ts

// Parsing of a pasted card list ("1 Erode (SOS) 15", the format deck sites export) into entries,
// shared by the Telegram bot's import and the site's future one. No I/O: resolving an entry to a
// card is decklistLookup.ts.

export interface DecklistEntry {
  // 1-based line of the pasted text, to point at an unrecognized line
  line: number
  raw: string
  quantity: number
  name: string
  setCode: string | null
  collectorNumber: string | null
  foil: boolean
}

export interface ParsedDecklist {
  entries: DecklistEntry[]
  // Lines that held no card name (e.g. a bare number)
  invalid: { line: number, raw: string }[]
}

const MAX_QUANTITY = 99

// Section headers and comments some exports add around the cards
const SKIPPED_LINE = /^(?:\/\/|#)|^(?:deck|sideboard|maybeboard|mainboard|commander|companion|about)\s*:?$/i

// "[qty[x]] name [(SET) [number]] [*F*]": quantity and set are optional, *F*/*E* mark a foil/etched
const LINE = /^(?:(\d{1,3})\s*x?\s+)?(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\)(?:\s+([A-Za-z0-9★†-]+))?)?(?:\s+\*([FE])\*)?$/

// The unambiguous shape of an export: quantity, name, set and collector number on every line
const STRICT_LINE = /^\d{1,2}\s*x?\s+.+?\s+\([A-Za-z0-9]{2,6}\)\s+[A-Za-z0-9★†-]+(?:\s+\*[FE]\*)?$/

function contentLines(text: string): { line: number, raw: string }[] {
  return text
    .split(/\r?\n/)
    .map((raw, index) => ({ line: index + 1, raw: raw.trim() }))
    .filter(({ raw }) => raw !== '' && !SKIPPED_LINE.test(raw))
}

export function parseDecklist(text: string): ParsedDecklist {
  const entries: DecklistEntry[] = []
  const invalid: ParsedDecklist['invalid'] = []

  for (const { line, raw } of contentLines(text)) {
    const match = LINE.exec(raw)
    const quantity = match?.[1] ? Number(match[1]) : 1
    const name = match?.[2]?.trim()

    if (!match || !name || quantity < 1 || quantity > MAX_QUANTITY) {
      invalid.push({ line, raw })
      continue
    }

    entries.push({
      line,
      raw,
      quantity,
      name,
      setCode: match[3] ? match[3].toLowerCase() : null,
      collectorNumber: match[4] ?? null,
      foil: match[5] !== undefined
    })
  }

  return { entries, invalid }
}

// True only when EVERY line has the full export shape: safe to treat an unprompted message as a
// card list, where "2 pizze" or a sentence must never match
export function looksLikeDecklist(text: string): boolean {
  const lines = contentLines(text)
  return lines.length > 0 && lines.every(({ raw }) => STRICT_LINE.test(raw))
}
