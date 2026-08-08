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

// Scryfall aggiorna i prezzi ~1 volta al giorno (vedi Scryfall API docs) —
// richiamare di nuovo la carta per id basta per un prezzo CardMarket fresco,
// nessuna autenticazione richiesta.
// Il finish va dedotto dalla stampa, non solo dal treatment della richiesta:
// esistono stampe solo-foil (Pramikon, Sky Rampart in c19; le showcase
// giapponesi di Duskmourn) dove prices.eur è null per costruzione e il prezzo
// vive in prices.eur_foil. Leggendo solo .eur si otteneva null su quelle
// carte — e lo stesso effectiveFoil serve a CardTrader, che altrimenti filtra
// mtg_foil=false su una carta che in non-foil non è mai esistita.
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

// CardTrader non restituisce un prezzo unico ma l'elenco di tutte le
// inserzioni per il blueprint — si prende il minimo tra quelle in condizione
// Near Mint, foil coerente con la stampa e lingua coerente con la richiesta.
//
// La lingua si filtra qui e non più via query param (`language: 'en'`
// hardcoded): quel default rendeva i due prezzi non confrontabili, perché
// Scryfall/CardMarket quota il prodotto in qualsiasi lingua mentre noi
// chiedevamo solo le copie inglesi. Su una stampa japanshowcase (es.
// Enduring Vitality dsk/394) la differenza era 4× — inglese scarso, non un
// errore di lookup. `language` null = "Indifferente": nessun filtro, minimo
// globale.
//
// NB: il confronto assume che i codici lingua di CardTrader coincidano con i
// nostri (en/it/es/fr/de/ja). Se per una lingua non tornasse mai un match, è
// lì che va guardato per primo — il fallimento è un null silenzioso.
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

// Risolve il blueprint CardTrader di una stampa (cacheato, vedi cardTrader.ts)
// e ne legge il prezzo minimo — unico punto che entrambi refreshWantedCard
// Prices (righe già salvate) e il picker "Edizione" di AddModal.vue
// (stampe candidate, non ancora salvate) usano per non duplicare il resolve.
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

// Aggiorna entrambe le fonti di prezzo di una wanted-card già salvata — se la
// carta non è in vendita su CardTrader, cardtraderPrice resta null senza
// sollevare errore. Ogni fonte fallisce in modo indipendente: un errore
// Scryfall non deve impedire l'aggiornamento del prezzo CardTrader e viceversa.
export async function refreshWantedCardPrices(
  supabase: SupabaseClient<Database>,
  cardTraderToken: string | undefined,
  scryfallId: string,
  setCode: string,
  foil: boolean,
  language: string | null
): Promise<PriceRefreshResult> {
  // Fallback al treatment se Scryfall non risponde: meglio del nulla, ed è il
  // comportamento che questo path aveva prima di conoscere i finish.
  const { price: cardmarketPrice, effectiveFoil } = await fetchCardmarketPrice(scryfallId, foil)
    .catch(() => ({ price: null, effectiveFoil: foil }))

  const cardtraderPrice = cardTraderToken
    ? await fetchCardtraderPriceForPrinting(
      supabase, cardTraderToken, scryfallId, setCode, effectiveFoil, language
    )
    : null

  return { cardmarketPrice, cardtraderPrice }
}
