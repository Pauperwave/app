// app\composables\wantedCards\useScryfallDragDrop.ts
// Drag a card image off Scryfall (or any site that renders one with an
// `alt="Card Name (Set Name #123)"` <img>) onto /wanted-cards to pre-fill
// the "Nuova richiesta" modal's name AND printing fields (user request
// 2026-08-15). Scryfall's own image URLs are opaque UUIDs (no card
// identity in them), so both have to come from the dragged element's alt
// text instead — the browser includes the dragged node's outerHTML in the
// drop event's `text/html` data. This isn't a documented Scryfall API
// contract, just how their markup happens to look today, so a failed
// parse is expected to happen sometimes and must fail silently (no modal,
// no error) rather than open a broken one.
import type { MaybeRefOrGetter } from 'vue'

export interface DroppedCardInfo {
  name: string
  setName: string | null
  collectorNumber: string | null
}

export function parseCardNameFromDrop(event: DragEvent): DroppedCardInfo | null {
  const html = event.dataTransfer?.getData('text/html')
  if (!html) return null

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const alt = doc.querySelector('img')?.getAttribute('alt')?.trim()
  if (!alt) return null

  // "Card Name (Set Name #123)" — confirmed 2026-08-15, e.g. "Bilbo's
  // Gambit (The Hobbit #5)". Falls back to the whole alt text as the name
  // when it doesn't match (no printing to auto-select then, just the name).
  const match = alt.match(/^(.*?)\s*\(([^#]+)#\s*(\S+)\)\s*$/)
  if (!match) return { name: alt, setName: null, collectorNumber: null }

  const [, name, setName, collectorNumber] = match
  return {
    name: (name ?? '').trim(),
    setName: (setName ?? '').trim(),
    collectorNumber: (collectorNumber ?? '').trim()
  }
}

export function useScryfallDragDrop(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  onCard: (card: DroppedCardInfo) => void
) {
  const { isOverDropZone } = useDropZone(target, {
    onDrop: (_files, event) => {
      const card = parseCardNameFromDrop(event)
      if (card) onCard(card)
    }
  })

  return { isOverDropZone }
}
