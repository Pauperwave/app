// server\utils\priceRefresh.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2'
const SCRYFALL_USER_AGENT = 'PauperWave-app/1.0 (wanted-cards price refresh; contact: emanuelenardi.dev@gmail.com)'

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

// Scryfall refreshes prices ~once a day (see the Scryfall API docs) — fetching the
// card by id again is enough for a fresh CardMarket price, no authentication
// required.
// The finish has to be inferred from the printing, not just from the request's
// treatment: foil-only printings exist (Pramikon, Sky Rampart in c19; Duskmourn's
// Japanese showcases) where prices.eur is null by construction and the price lives
// in prices.eur_foil. Reading only .eur returned null on those cards — and the same
// effectiveFoil is needed by CardTrader, which would otherwise filter on
// mtg_foil=false for a card that never existed in non-foil.
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

// CardTrader returns no single price but the list of every listing for the
// blueprint — the minimum is taken among those in Near Mint condition, with a foil
// flag consistent with the printing and a language consistent with the request.
//
// Language is filtered here and no longer via query param (hardcoded
// `language: 'en'`): that default made the two prices incomparable, because
// Scryfall/CardMarket quote the product in any language while we asked for English
// copies only. On a japanshowcase printing (e.g. Enduring Vitality dsk/394) the
// difference was 4× — scarce in English, not a lookup error. `language` null =
// "Any": no filter, global minimum.
//
// NB: the comparison assumes CardTrader's language codes match ours
// (en/it/es/fr/de/ja). If some language never returns a match, that is the first
// place to look — the failure mode is a silent null.
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

// Resolves a printing's CardTrader blueprint (cached, see cardTrader.ts) and reads
// its minimum price — the single place used by both refreshWantedCardPrices (rows
// already saved) and AddModal.vue's "Edition" picker (candidate printings, not yet
// saved), so the resolve is not duplicated.
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

// Refreshes both price sources of an already saved wanted card — if the card is not
// on sale on CardTrader, cardtraderPrice stays null without raising. Each source
// fails independently: a Scryfall error must not block the CardTrader price update,
// and vice versa.
export async function refreshWantedCardPrices(
  supabase: SupabaseClient<Database>,
  cardTraderToken: string | undefined,
  scryfallId: string,
  setCode: string,
  foil: boolean,
  language: string | null
): Promise<PriceRefreshResult> {
  // Fall back to the treatment when Scryfall does not answer: better than nothing,
  // and it is how this path behaved before it knew about finishes.
  const { price: cardmarketPrice, effectiveFoil } = await fetchCardmarketPrice(scryfallId, foil)
    .catch(() => ({ price: null, effectiveFoil: foil }))

  const cardtraderPrice = cardTraderToken
    ? await fetchCardtraderPriceForPrinting(
      supabase, cardTraderToken, scryfallId, setCode, effectiveFoil, language
    )
    : null

  return { cardmarketPrice, cardtraderPrice }
}
