// server\utils\telegram\commands\cards\priceCard.ts
import { InlineKeyboard } from 'grammy'
import type { InputMessageContent } from 'grammy/types'
import { isFoilOnlyPrinting } from '#shared/utils/wantedCards/wantedCardRow'
import { ICONS } from '~~/server/utils/telegram/icons'

// Pure part of /prezzo: the filter state carried in callback_data, the inline result of each
// printing and the rich message built from them.

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

// 'pending': CardTrader hasn't been asked yet (an inline result can't wait for it), the bot edits
// the message once the printing is picked; a language button press fetches it too
export type PriceCardtraderState = PriceCardtrader | 'pending' | null

// The card art rides on a text message as a link preview: a text message can't hold a photo, and
// this keeps editMessageText working for inline messages
export function artPreview(imageUrl: string | null) {
  if (!imageUrl) return { is_disabled: true }
  return { url: imageUrl, prefer_large_media: true, show_above_text: true }
}

export const PRICE_CALLBACK_PREFIX = 'prz:'
export const WANT_CALLBACK_PREFIX = 'prw:'
export const FOUND_CALLBACK_PREFIX = 'prf:'
export const REMOVE_CALLBACK_PREFIX = 'prd:'
export const PRICE_INLINE_PREFIX = '€'

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

// Once the card is among the wanted ones, "found" and "remove" act on that row under their own prefix
export function encodeFoundState(state: PriceState): string {
  return encodeState(FOUND_CALLBACK_PREFIX, state)
}

export function encodeRemoveState(state: PriceState): string {
  return encodeState(REMOVE_CALLBACK_PREFIX, state)
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

export function decodeFoundState(data: string): PriceState | null {
  return decodeState(FOUND_CALLBACK_PREFIX, data)
}

export function decodeRemoveState(data: string): PriceState | null {
  return decodeState(REMOVE_CALLBACK_PREFIX, data)
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

// CardMarket's own language ids, for the `language` query parameter of its product pages
const CARDMARKET_LANGUAGE_IDS: Record<Exclude<PriceLanguage, 'all'>, number> = { en: 1, it: 5 }

// The page opens already filtered to the chosen language (the price shown can't be: Scryfall's isn't)
export function cardmarketUrlFor(printing: PricePrinting, language: PriceLanguage): string | null {
  if (!printing.cardmarketUrl) return null
  if (language === 'all') return printing.cardmarketUrl

  const url = new URL(printing.cardmarketUrl)
  url.searchParams.set('language', String(CARDMARKET_LANGUAGE_IDS[language]))
  return url.toString()
}

export function cardmarketPriceOf(printing: PricePrinting, foil: boolean): number | null {
  return foil ? printing.cardmarketFoilPrice : printing.cardmarketPrice
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

function cardmarketNote(state: PriceState): string {
  return state.language === 'all' ? '' : ' (non filtrabile per lingua)'
}

function cardtraderCondition(state: PriceState): string {
  return `(NM, ${LANGUAGE_NAMES[state.language]})`
}

// Keyboard under the price message. The language and foil filters live inside the rich message;
// this one carries the wanted-card actions. `wanted`: the card is already among the associate's
// wanted ones, so the add button gives way to an "already there" label with "found" and "remove"
// next to it.
export function buildWantedKeyboard(
  printing: PricePrinting,
  state: PriceState,
  wanted = false
): InlineKeyboard {
  // The wanted row is looked up by the finish actually priced, which a foil-only printing forces
  const wantState = { ...state, foil: effectiveFoil(printing, state) }

  if (!wanted) {
    // Saves this printing with the chosen language and finish as a wanted card
    return new InlineKeyboard().text(`${ICONS.wanted} Aggiungi alle mie carte cercate`, encodeWantState(state))
  }

  return new InlineKeyboard()
    // The label is a button too: pressing it explains, through the add handler's own toast
    .text(`${ICONS.success} Carta già presente nelle tue carte cercate`, encodeWantState(wantState))
    .row()
    .text(`${ICONS.found} Segna come trovata`, encodeFoundState(wantState))
    .text(`${ICONS.trash} Rimuovi`, encodeRemoveState(wantState))
}

function filterButtons(printing: PricePrinting, state: PriceState) {
  const languages = LANGUAGES.map(language => ({
    text: `${state.language === language ? `${ICONS.success} ` : ''}${LANGUAGE_LABELS[language]}`,
    callback_data: encodePriceState({ ...state, language })
  }))
  if (!canToggleFoil(printing)) return languages

  return [
    ...languages,
    { text: `${ICONS.foil} Foil: ${state.foil ? 'sì' : 'no'}`, callback_data: encodePriceState({ ...state, foil: !state.foil }) }
  ]
}

// 'inline': the message of an inline result, which can't carry a photo but holds the language and foil
// filters. 'detail': a message the bot sends itself, with the card art on top and no filters.
export type PriceMessageKind = 'inline' | 'detail'

// The rich message type an inline result accepts: only already uploaded files, no new ones
type InlineRichMessage = Extract<InputMessageContent, { rich_message: unknown }>['rich_message']

// Callers add the keyboard (the wanted-card actions)
export function buildPriceRichMessage(
  printing: PricePrinting,
  state: PriceState,
  cardtrader: PriceCardtraderState,
  kind: PriceMessageKind
): InlineRichMessage {
  const foil = effectiveFoil(printing, state)
  const finish = foil ? 'foil' : 'normale'
  const storeName = (name: string) => ({ type: 'bold' as const, text: { type: 'underline' as const, text: name } })
  const price = (value: number | null, emptyText: string) => (
    value === null ? emptyText : { type: 'bold' as const, text: euroFormatter.format(value) }
  )

  let cardtraderValue: ReturnType<typeof price> = 'non disponibile'
  if (cardtrader === 'pending') cardtraderValue = 'controllo in corso…'
  else if (cardtrader) cardtraderValue = price(cardtrader.price, 'nessuna offerta')

  const cardmarketUrl = cardmarketUrlFor(printing, state.language)
  const storeLinks = [
    ...(cardmarketUrl ? [{ text: 'CardMarket', url: cardmarketUrl }] : []),
    ...(cardtrader && cardtrader !== 'pending' && cardtrader.url ? [{ text: 'CardTrader', url: cardtrader.url }] : []),
    { text: 'Scryfall', url: printing.scryfallUrl }
  ]

  return {
    blocks: [
      ...(kind === 'detail' && printing.imageUrl
        ? [{ type: 'photo' as const, photo: { type: 'photo' as const, media: printing.imageUrl } }]
        : []),
      { type: 'paragraph', text: [`${ICONS.card} `, { type: 'bold', text: printing.name }] },
      { type: 'paragraph', text: `${printing.setName} · ${printing.set.toUpperCase()} #${printing.collectorNumber} · ${finish}` },
      ...(kind === 'inline' ? [{ type: 'buttons' as const, buttons: filterButtons(printing, state) }] : []),
      {
        type: 'paragraph',
        text: [storeName('CardMarket'), ': ', price(cardmarketPriceOf(printing, foil), 'non disponibile'), cardmarketNote(state)]
      },
      {
        type: 'paragraph',
        text: [storeName('CardTrader'), ` ${cardtraderCondition(state)}: `, cardtraderValue]
      },
      { type: 'buttons', buttons: storeLinks }
    ]
  }
}
