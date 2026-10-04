// server\utils\telegram\commands\cards\priceCard.ts
import { InlineKeyboard } from 'grammy'
import type { InputRichMessageWithoutUpload } from 'grammy/types'
import { isFoilOnlyPrinting } from '#shared/utils/wantedCards/wantedCardRow'
import { ICONS } from '~~/server/utils/telegram/icons'

// Pure part of /prezzo: the filter state carried in callback_data, the inline result of each
// printing and the rich message built from them.

type Blocks = NonNullable<InputRichMessageWithoutUpload['blocks']>
type RichText = Extract<Blocks[number], { type: 'paragraph' }>['text']
type Buttons = Extract<Blocks[number], { type: 'buttons' }>['buttons']

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

function formatPrice(price: number | null, emptyText: string): RichText {
  return price === null ? emptyText : { type: 'bold', text: euroFormatter.format(price) }
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

// The language and foil buttons sit inside the message, in one row between the card and its prices.
// The art is a photo block by URL: a posted message accepts it when edited, but an inline result
// is rejected whole, so the inline result goes without (withArt: false) and the first edit adds it.
export function buildPriceMessage(
  printing: PricePrinting,
  state: PriceState,
  cardtrader: PriceCardtraderState,
  withArt: boolean
): InputRichMessageWithoutUpload {
  const foil = effectiveFoil(printing, state)

  const cardmarketLine: RichText = [
    'CardMarket: ',
    formatPrice(cardmarketPriceOf(printing, foil), 'non disponibile'),
    state.language === 'all' ? '' : ' (non filtrabile per lingua)'
  ]

  const cardtraderLabel = `CardTrader (NM, ${LANGUAGE_NAMES[state.language]}): `
  let cardtraderLine: RichText = `${cardtraderLabel}non disponibile`
  if (cardtrader === 'pending') {
    cardtraderLine = `${cardtraderLabel}controllo in corso…`
  } else if (cardtrader) {
    cardtraderLine = [cardtraderLabel, formatPrice(cardtrader.price, 'nessuna offerta')]
  }

  // A foil-only printing has no toggle to show it, so the set line says it
  const finishNote = isFoilForced(printing) ? ' · foil' : ''

  const filterButtons: Buttons = LANGUAGES.map(language => ({
    text: `${state.language === language ? `${ICONS.success} ` : ''}${LANGUAGE_LABELS[language]}`,
    callback_data: encodePriceState({ ...state, language })
  }))
  if (canToggleFoil(printing)) {
    filterButtons.push({
      text: `${ICONS.foil} Foil: ${state.foil ? 'sì' : 'no'}`,
      callback_data: encodePriceState({ ...state, foil: !state.foil })
    })
  }

  const blocks: Blocks = []
  if (withArt && printing.imageUrl) {
    blocks.push({ type: 'photo', photo: { type: 'photo', media: printing.imageUrl } })
  }

  blocks.push(
    {
      type: 'paragraph',
      text: [
        { type: 'bold', text: `${ICONS.card} ${printing.name}` },
        `\n${printing.setName} · ${printing.set.toUpperCase()} #${printing.collectorNumber}${finishNote}`
      ]
    },
    { type: 'buttons', buttons: filterButtons },
    { type: 'paragraph', text: [cardmarketLine, '\n', cardtraderLine] }
  )

  return { blocks }
}

// Below the message, not in it: the wanted-card action and the links. A real inline keyboard also
// has to be attached for Telegram to hand the bot the posted inline message
// (chosen_inline_result.inline_message_id).
export function buildPriceKeyboard(
  printing: PricePrinting,
  state: PriceState,
  cardtraderUrl: string | null
): InlineKeyboard {
  const keyboard = new InlineKeyboard()

  // Saves this printing with the chosen language and finish as a wanted card
  keyboard.text(`${ICONS.wanted} Aggiungi alle mie cercate`, encodeWantState(state)).row()

  if (printing.cardmarketUrl) keyboard.url('CardMarket', printing.cardmarketUrl)
  if (cardtraderUrl) keyboard.url('CardTrader', cardtraderUrl)
  keyboard.url('Scryfall', printing.scryfallUrl)

  return keyboard
}
