// shared\utils\wantedCards\decklistLookup.ts
import type { ScryfallCard } from '#shared/types/scryfall'
import type { DecklistEntry } from './decklist'

// Resolves a pasted entry to a Scryfall card. The HTTP call is injected so the same logic runs on
// the server (the bot) and in the browser (the site), and is testable without a network.
// The getter returns null on a 404 and throws on anything else.
export type ScryfallGetter = <T>(path: string, query?: Record<string, string>) => Promise<T | null>

// From the most to the least precise: set + collector number, then the name within the set (a
// deck site and Scryfall can number a printing differently), then the name alone (Scryfall's
// default printing). Null when nothing matches.
export async function lookupDecklistEntry(
  entry: Pick<DecklistEntry, 'name' | 'setCode' | 'collectorNumber'>,
  get: ScryfallGetter
): Promise<ScryfallCard | null> {
  if (entry.setCode && entry.collectorNumber) {
    const exact = await get<ScryfallCard>(
      `/cards/${entry.setCode}/${encodeURIComponent(entry.collectorNumber)}`
    )
    if (exact) return exact
  }

  if (entry.setCode) {
    const inSet = await get<ScryfallCard>('/cards/named', { fuzzy: entry.name, set: entry.setCode })
    if (inSet) return inSet
  }

  return get<ScryfallCard>('/cards/named', { fuzzy: entry.name })
}
