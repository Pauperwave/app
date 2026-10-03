// server\utils\priceRefresh.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2'
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (wanted-cards price refresh; contact: emanuelenardi.dev@gmail.com)'

interface CardTraderMarketplaceProduct {
  price_cents: number
  properties_hash: {
    condition: string
    mtg_foil: boolean
    mtg_language?: string
  }
}

export interface PriceRefreshResult {
  cardmarketPrice: number | null
  cardtraderPrice: number | null
}

// Scryfall refreshes prices ~once a day: fetching the card by id again gives a fresh CardMarket
// price, no auth needed. The finish is inferred from the printing, not just the requested
// treatment: foil-only printings have prices.eur null and the price in prices.eur_foil. The same
// effectiveFoil is reused for CardTrader, which would otherwise filter on mtg_foil=false for a
// foil-only card.
interface ScryfallPriceResult {
  price: number | null
  effectiveFoil: boolean
}

async function fetchCardmarketPrice(
  scryfallId: string,
  wantsFoil: boolean
): Promise<ScryfallPriceResult> {
  const card = await $fetch<{
    finishes?: string[]
    prices?: { eur?: string | null, eur_foil?: string | null }
  }>(`https://api.scryfall.com/cards/${scryfallId}`, {
    headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
  })

  const effectiveFoil = wantsFoil || !(card.finishes ?? []).includes('nonfoil')

  const raw = effectiveFoil ? card.prices?.eur_foil : card.prices?.eur
  if (!raw) return { price: null, effectiveFoil }
  const parsed = Number(raw)
  return { price: Number.isFinite(parsed) ? parsed : null, effectiveFoil }
}

// CardTrader returns the list of every listing for the blueprint, not one price: the minimum among
// Near Mint listings with a consistent foil flag and language is taken. `language` null = "Any": no
// filter, global minimum (forcing English made the price incomparable with Scryfall/CardMarket,
// which quote any language).
//
// NB: assumes CardTrader's language codes match ours (en/it/es/fr/de/ja); a mismatch fails as a
// silent null.
async function fetchCardtraderPrice(
  token: string,
  blueprintId: number,
  foil: boolean,
  language: string | null
): Promise<number | null> {
  const response = await $fetch<Record<string, CardTraderMarketplaceProduct[]>>(
    `${CARDTRADER_API_BASE}/marketplace/products`,
    {
      headers: { Authorization: `Bearer ${token}` },
      query: { blueprint_id: blueprintId }
    }
  )

  const products = response[String(blueprintId)] ?? []
  const eligible = products.filter(product =>
    product.properties_hash.condition === 'Near Mint'
    && product.properties_hash.mtg_foil === foil
    && (!language || product.properties_hash.mtg_language === language))

  if (!eligible.length) return null
  return Math.min(...eligible.map(product => product.price_cents)) / 100
}

// Resolves a printing's CardTrader blueprint (cached, see cardTrader.ts) and reads its minimum
// price: shared by refreshWantedCardPrices (saved rows) and AddModal.vue's "Edition" picker
// (candidates), so the resolve isn't duplicated
export async function fetchCardtraderPriceForPrinting(
  supabase: SupabaseClient<Database>,
  cardTraderToken: string,
  scryfallId: string,
  setCode: string,
  foil: boolean,
  language: string | null
): Promise<number | null> {
  const { blueprintId } = await resolveCardTraderBlueprint(
    supabase, cardTraderToken, scryfallId, setCode
  )
  if (!blueprintId) return null

  return fetchCardtraderPrice(cardTraderToken, blueprintId, foil, language).catch(() => null)
}

// Refreshes both price sources of a saved wanted card (cardtraderPrice stays null if not on sale on
// CardTrader). Each source fails independently: a Scryfall error must not block the CardTrader
// update.
export async function refreshWantedCardPrices(
  supabase: SupabaseClient<Database>,
  cardTraderToken: string | undefined,
  scryfallId: string,
  setCode: string,
  foil: boolean,
  language: string | null
): Promise<PriceRefreshResult> {
  // Fall back to the requested treatment when Scryfall doesn't answer
  const { price: cardmarketPrice, effectiveFoil } = await fetchCardmarketPrice(scryfallId, foil)
    .catch(() => ({ price: null, effectiveFoil: foil }))

  const cardtraderPrice = cardTraderToken
    ? await fetchCardtraderPriceForPrinting(
      supabase, cardTraderToken, scryfallId, setCode, effectiveFoil, language
    )
    : null

  return { cardmarketPrice, cardtraderPrice }
}
