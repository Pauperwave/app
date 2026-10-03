// server\utils\telegram\commands\cards\priceCard.ts
import { InlineKeyboard } from 'grammy'
import { isFoilOnlyPrinting } from '#shared/utils/wantedCards/wantedCardRow'
import { ICONS } from '../../icons'

// Pure part of /prezzo: the filter state carried in callback_data, the inline result of each
// printing and the message built from them. Messages are HTML: an inline message can't be a rich
// message, and plain HTML text is edited the same way whoever sent it.

export type PriceLanguage = 'all' | 'it' | 'en'

export interface PriceState {
  scryfallId: string
  language: PriceLanguage
  foil: boolean
}

export interface PricePrinting {
  id: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  finishes: string[]
  cardmarketPrice: number | null
  cardmarketFoilPrice: number | null
  cardmarketUrl: string | null
  scryfallUrl: string
  thumbnailUrl: string | null
  imageUrl: string | null
}

export interface PriceCardtrader {
  price: number | null
  url: string | null
}

// 'pending': CardTrader hasn't been asked yet (an inline result can't wait for it), a language
// button press fetches it
export type PriceCardtraderState = PriceCardtrader | 'pending' | null

export const PRICE_CALLBACK_PREFIX = 'prz:'
export const WANT_CALLBACK_PREFIX = 'prw:'
export const PRICE_INLINE_PREFIX = '$'

const LANGUAGES: PriceLanguage[] = ['all', 'it', 'en']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const LANGUAGE_LABELS: Record<PriceLanguage, string> = {
  all: `${ICONS.languageAll} Tutte`,
  it: `${ICONS.languageIt} ITA`,
  en: `${ICONS.languageEn} ENG`
}

const LANGUAGE_NAMES: Record<PriceLanguage, string> = {
  all: 'tutte le lingue',
  it: 'italiano',
  en: 'inglese'
}

const euroFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Same "prefix:uuid:language:foil" shape as the other bot callbacks, well under Telegram's 64 bytes
function encodeState(prefix: string, state: PriceState): string {
  return `${prefix}${state.scryfallId}:${state.language}:${state.foil ? 1 : 0}`
}

export function encodePriceState(state: PriceState): string {
  return encodeState(PRICE_CALLBACK_PREFIX, state)
}

// The "add to my wanted cards" button carries the same state, under its own prefix
export function encodeWantState(state: PriceState): string {
  return encodeState(WANT_CALLBACK_PREFIX, state)
}

// Null for anything malformed: callback_data is client-controlled, never trusted blindly
function decodeState(prefix: string, data: string): PriceState | null {
  if (!data.startsWith(prefix)) return null

  const parts = data.slice(prefix.length).split(':')
  const scryfallId = parts[0]
  const language = parts[1] as PriceLanguage
  const foil = parts[2]

  if (parts.length !== 3 || !scryfallId || !UUID_PATTERN.test(scryfallId)) return null
  if (!LANGUAGES.includes(language)) return null
  if (foil !== '0' && foil !== '1') return null

  return { scryfallId, language, foil: foil === '1' }
}

export function decodePriceState(data: string): PriceState | null {
  return decodeState(PRICE_CALLBACK_PREFIX, data)
}

export function decodeWantState(data: string): PriceState | null {
  return decodeState(WANT_CALLBACK_PREFIX, data)
}

// A printing with no nonfoil finish can only be priced as foil, like the wanted-cards price refresh
export function isFoilForced(printing: PricePrinting): boolean {
  return isFoilOnlyPrinting(printing.finishes)
}

// "Tutte" is stored as no language preference
export function wantedLanguageOf(language: PriceLanguage): string | null {
  return language === 'all' ? null : language
}

// The foil toggle only makes sense when the printing exists in both finishes
export function canToggleFoil(printing: PricePrinting): boolean {
  const hasFoil = printing.finishes.includes('foil') || printing.finishes.includes('etched')
  return hasFoil && !isFoilForced(printing)
}

export function effectiveFoil(printing: PricePrinting, state: PriceState): boolean {
  return isFoilForced(printing) || (state.foil && canToggleFoil(printing))
}

export function cardmarketPriceOf(printing: PricePrinting, foil: boolean): number | null {
  return foil ? printing.cardmarketFoilPrice : printing.cardmarketPrice
}

function formatPrice(price: number | null, emptyText: string): string {
  return price === null ? emptyText : `<b>${euroFormatter.format(price)}</b>`
}

// Cheapest printing first, printings with no CardMarket price last (ties keep Scryfall's order)
export function sortByCardmarketPrice(printings: PricePrinting[]): PricePrinting[] {
  const rank = (printing: PricePrinting) => printing.cardmarketPrice ?? Number.POSITIVE_INFINITY
  return [...printings].sort((a, b) => rank(a) - rank(b))
}

export function buildInlineTitle(printing: PricePrinting): string {
  return `${printing.name} — ${printing.set.toUpperCase()} #${printing.collectorNumber}`
}

// What the inline list shows per printing, so the cheapest/right one can be picked at a glance
export function buildInlineDescription(printing: PricePrinting): string {
  const prices: string[] = []
  if (printing.cardmarketPrice !== null) {
    prices.push(`CM ${euroFormatter.format(printing.cardmarketPrice)}`)
  }
  if (printing.cardmarketFoilPrice !== null) {
    prices.push(`foil ${euroFormatter.format(printing.cardmarketFoilPrice)}`)
  }
  return `${printing.setName} · ${prices.length ? prices.join(' · ') : 'nessun prezzo CardMarket'}`
}

export function buildPriceText(
  printing: PricePrinting,
  state: PriceState,
  cardtrader: PriceCardtraderState
): string {
  const foil = effectiveFoil(printing, state)
  const finish = foil ? 'foil' : 'normale'

  const cardmarketLine = `CardMarket: ${formatPrice(cardmarketPriceOf(printing, foil), 'non disponibile')}`
    + (state.language === 'all' ? '' : ' (non filtrabile per lingua)')

  const cardtraderLabel = `CardTrader (NM, ${LANGUAGE_NAMES[state.language]})`
  let cardtraderLine = `${cardtraderLabel}: non disponibile`
  if (cardtrader === 'pending') {
    cardtraderLine = 'CardTrader: scegli una lingua qui sotto per controllarlo'
  } else if (cardtrader) {
    cardtraderLine = `${cardtraderLabel}: ${formatPrice(cardtrader.price, 'nessuna offerta')}`
  }

  return [
    `${ICONS.card} <b>${escapeHtml(printing.name)}</b>`,
    `${escapeHtml(printing.setName)} · ${printing.set.toUpperCase()} #${printing.collectorNumber} · ${finish}`,
    cardmarketLine,
    cardtraderLine
  ].join('\n')
}

export function buildPriceKeyboard(
  printing: PricePrinting,
  state: PriceState,
  cardtraderUrl: string | null,
  languageChosen = true
): InlineKeyboard {
  const keyboard = new InlineKeyboard()

  for (const language of LANGUAGES) {
    const active = languageChosen && state.language === language
    keyboard.text(
      `${active ? '✅ ' : ''}${LANGUAGE_LABELS[language]}`,
      encodePriceState({ ...state, language })
    )
  }

  if (canToggleFoil(printing)) {
    keyboard.row().text(
      `${ICONS.foil} Foil: ${state.foil ? 'sì' : 'no'}`,
      encodePriceState({ ...state, foil: !state.foil })
    )
  }

  // Saves this printing with the chosen language and finish as a wanted card
  keyboard.row().text(`${ICONS.wanted} Aggiungi alle mie cercate`, encodeWantState(state))

  keyboard.row()
  if (printing.cardmarketUrl) keyboard.url('CardMarket', printing.cardmarketUrl)
  if (cardtraderUrl) keyboard.url('CardTrader', cardtraderUrl)
  keyboard.url('Scryfall', printing.scryfallUrl)

  return keyboard
}
