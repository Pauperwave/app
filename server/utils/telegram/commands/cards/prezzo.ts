// server\utils\telegram\commands\cards\prezzo.ts
import type { Bot, Context } from 'grammy'
import { GrammyError } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { answerLoadError } from '../callbackErrors'
import {
  PRICE_CALLBACK_PREFIX,
  buildPriceKeyboard,
  buildPriceText,
  decodePriceState,
  effectiveFoil,
  type PriceCardtrader,
  type PricePrinting,
  type PriceState
} from './priceCard'

import { fetchCardtraderPrice } from '../../../priceRefresh'
import { resolveCardTraderBlueprint } from '../../../cardTrader'

const SCRYFALL_API = 'https://api.scryfall.com'
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (Telegram bot card prices; contact: emanuelenardi.dev@gmail.com)'
const NOT_FOUND_TEXT = '🤔 Non trovo questa carta. Scrivi il nome inglese, es. /prezzo Lightning Bolt.'
const USAGE_TEXT = 'Scrivi il nome della carta, es. /prezzo Lightning Bolt.'

interface ScryfallCard {
  id: string
  name: string
  set: string
  collector_number: string
  finishes?: string[]
  prices?: { eur?: string | null, eur_foil?: string | null }
  purchase_uris?: { cardmarket?: string }
  scryfall_uri: string
}

function scryfallGet<T>(path: string, query?: Record<string, string>) {
  return $fetch<T>(`${SCRYFALL_API}${path}`, {
    query,
    headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
  })
}

function toPrice(raw: string | null | undefined): number | null {
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

function toPrinting(card: ScryfallCard): PricePrinting {
  return {
    id: card.id,
    name: card.name,
    set: card.set,
    collectorNumber: card.collector_number,
    finishes: card.finishes ?? [],
    cardmarketPrice: toPrice(card.prices?.eur),
    cardmarketFoilPrice: toPrice(card.prices?.eur_foil),
    cardmarketUrl: card.purchase_uris?.cardmarket ?? null,
    scryfallUrl: card.scryfall_uri
  }
}

// Scryfall answers 404 for an unknown or ambiguous name: that is "not found" here, not an error
async function scryfallOrNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) return null
    throw err
  }
}

// The name is resolved fuzzily first (typos, partial names), then every paper printing is listed
// and the cheapest on CardMarket wins: for most players "the price" is the cheapest copy
async function findCheapestPrinting(query: string): Promise<PricePrinting | null> {
  const named = await scryfallOrNull(
    scryfallGet<ScryfallCard>('/cards/named', { fuzzy: query })
  )
  if (!named) return null

  const search = await scryfallOrNull(scryfallGet<{ data: ScryfallCard[] }>('/cards/search', {
    q: `!"${named.name}" game:paper`,
    unique: 'prints',
    order: 'eur',
    dir: 'asc'
  }))

  const printings = (search?.data ?? [named]).map(toPrinting)
  const cheapest = printings
    .filter(printing => printing.cardmarketPrice !== null)
    .sort((a, b) => (a.cardmarketPrice ?? 0) - (b.cardmarketPrice ?? 0))[0]

  return cheapest ?? printings[0] ?? null
}

async function fetchPrinting(scryfallId: string): Promise<PricePrinting | null> {
  const card = await scryfallOrNull(scryfallGet<ScryfallCard>(`/cards/${scryfallId}`))
  return card ? toPrinting(card) : null
}

// Null when CardTrader can't be asked (no token) or fails: the message then says "non disponibile"
async function fetchCardtrader(
  printing: PricePrinting,
  state: PriceState
): Promise<PriceCardtrader | null> {
  const token = useRuntimeConfig().cardTraderApiToken
  if (!token) return null

  try {
    const supabase = telegramServiceSupabaseClient()
    const { blueprintId, url } = await resolveCardTraderBlueprint(
      supabase, token, printing.id, printing.set
    )
    if (!blueprintId) return { price: null, url: null }

    const language = state.language === 'all' ? null : state.language
    const price = await fetchCardtraderPrice(
      token, blueprintId, effectiveFoil(printing, state), language
    )
    return { price, url }
  } catch (err) {
    console.error('CardTrader price lookup failed:', err)
    return null
  }
}

async function renderPrice(printing: PricePrinting, state: PriceState) {
  const cardtrader = await fetchCardtrader(printing, state)

  return {
    markdown: buildPriceText(printing, state, cardtrader),
    keyboard: buildPriceKeyboard(printing, state, cardtrader?.url ?? null)
  }
}

async function prezzoCommandHandler(ctx: Context) {
  const query = (ctx.match as string | undefined)?.trim()
  if (!query) {
    await ctx.reply(USAGE_TEXT)
    return
  }

  try {
    const printing = await findCheapestPrinting(query)
    if (!printing) {
      await ctx.reply(NOT_FOUND_TEXT)
      return
    }

    const { markdown, keyboard } = await renderPrice(
      printing, { scryfallId: printing.id, language: 'all', foil: false }
    )
    await ctx.replyWithRichMessage({ markdown }, { reply_markup: keyboard })
  } catch (err) {
    console.error('/prezzo failed:', err)
    await ctx.reply('⚠️ Non riesco a controllare il prezzo adesso. Riprova tra poco.')
  }
}

// A plain callback handler (not a Menu): the whole state travels in callback_data, so there is no
// registration-order dependency on bot.use(commands). A press re-renders the same message.
async function handlePriceButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(PRICE_CALLBACK_PREFIX)) return next()

  const state = decodePriceState(data)
  if (!state) {
    await ctx.answerCallbackQuery()
    return
  }

  try {
    const printing = await fetchPrinting(state.scryfallId)
    if (!printing) {
      await ctx.answerCallbackQuery({ text: NOT_FOUND_TEXT, show_alert: true })
      return
    }

    const { markdown, keyboard } = await renderPrice(printing, state)
    await ctx.editMessageText({ markdown }, { reply_markup: keyboard })
    await ctx.answerCallbackQuery()
  } catch (err) {
    // Pressing the active filter again re-renders identical content: not a failure
    if (err instanceof GrammyError && err.description.includes('message is not modified')) {
      await ctx.answerCallbackQuery()
      return
    }
    await answerLoadError(ctx)
  }
}

export function registerPrezzoCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.on('callback_query:data', handlePriceButton)
  commands.command(
    'prezzo',
    'Prezzo di una carta su CardMarket e CardTrader — es. /prezzo Lightning Bolt',
    prezzoCommandHandler
  )
}
