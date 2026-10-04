// app\utils\wantedCards\actionTargets.ts
import type { WantedCard } from '~/types'

// The wanted cards a context-menu action applies to: the whole selection when the right-clicked
// card is part of it (as in a file manager), otherwise that card alone
export function contextMenuTargets(card: WantedCard, selected: WantedCard[]): WantedCard[] {
  return selected.some(item => item.id === card.id) ? selected : [card]
}

// Prices are refreshed from the Scryfall id and the set code, missing only on requests created
// before migration 20260808120000 and never edited since
export function canRefreshPrices(card: Pick<WantedCard, 'scryfallId' | 'setCode'>): boolean {
  return !!card.scryfallId && !!card.setCode
}
