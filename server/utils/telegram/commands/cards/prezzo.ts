// server\utils\telegram\commands\cards\prezzo.ts
import type { Bot, Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InlineQueryResultArticle } from 'grammy/types'
import type { ScryfallCard } from '#shared/types/scryfall'

import { answerEditError } from '../callbackErrors'
import { registerDeepLink } from '../../deepLinks'
import {
  PRICE_CALLBACK_PREFIX,
  PRICE_INLINE_PREFIX,
  artPreview,
  buildInlineDescription,
  buildInlineTitle,
  buildPriceKeyboard,
  buildPriceText,
  decodePriceState,
  effectiveFoil,
  sortByCardmarketPrice,
  type PriceCardtrader,
  type PricePrinting,
  type PriceState
} from './priceCard'

import {
  fetchScryfallCard,
  scryfallGet,
  scryfallOrNull,
  toPrinting
} from './scryfall'

import { fetchCardtraderPrice } from '../../../priceRefresh'
import { resolveCardTraderBlueprint } from '../../../cardTrader'

const NOT_FOUND_TEXT = '🤔 Non trovo questa carta. Scrivi il nome inglese, es. /prezzo Lightning Bolt.'
const USAGE_TEXT = 'Scrivi il nome della carta per scegliere la stampa, es. /prezzo Lightning Bolt.'

// Telegram shows at most 50 inline results
const MAX_INLINE_RESULTS = 50
const MIN_QUERY_LENGTH = 2
// Prices move slowly: a short cache spares Scryfall repeated keystroke queries
const INLINE_CACHE_SECONDS = 60

// Resolves what was typed to one exact card name: fuzzy match first (typos, partial names), then
// Scryfall's own autocomplete for fragments the fuzzy match finds ambiguous
async function resolveCardName(query: string): Promise<string | null> {
  const named = await scryfallOrNull(
    scryfallGet<ScryfallCard>('/cards/named', { fuzzy: query })
  )
  if (named) return named.name

  const suggestions = await scryfallOrNull(
    scryfallGet<{ data: string[] }>('/cards/autocomplete', { q: query })
  )
  return suggestions?.data[0] ?? null
}

// Every paper printing of the card, cheapest on CardMarket first: which printing to price is the
// player's choice, so none is picked for them
async function findPrintings(query: string): Promise<PricePrinting[]> {
  const name = await resolveCardName(query)
  if (!name) return []

  const search = await scryfallOrNull(scryfallGet<{ data: ScryfallCard[] }>('/cards/search', {
    q: `!"${name}" game:paper`,
    unique: 'prints',
    order: 'eur',
    dir: 'asc'
  }))

  return sortByCardmarketPrice((search?.data ?? []).map(toPrinting))
}

async function fetchPrinting(scryfallId: string): Promise<PricePrinting | null> {
  const card = await fetchScryfallCard(scryfallId)
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

// /prezzo only opens the inline picker: the printing is chosen there, with its price in view
// Reached from /help's button and ?start=prezzo, where ctx.match isn't a card name
registerDeepLink('prezzo', ctx => ctx.reply(USAGE_TEXT))

async function prezzoCommandHandler(ctx: Context) {
  const query = (ctx.match as string | undefined)?.trim()
  if (!query) {
    await ctx.reply(USAGE_TEXT)
    return
  }

  await ctx.reply(`🃏 Scegli la stampa di «${query}» per vederne il prezzo.`, {
    reply_markup: new InlineKeyboard()
      .switchInlineCurrent('🔎 Scegli la stampa', `${PRICE_INLINE_PREFIX} ${query}`)
  })
}

// Inline mode, "$ <name>": one result per printing. The posted message already carries the
// CardMarket price (known from Scryfall) and the filter buttons; CardTrader is fetched on a press,
// since an inline result can't wait for it.
async function handlePriceInlineQuery(ctx: Context, next: () => Promise<void>) {
  const raw = ctx.inlineQuery?.query ?? ''
  if (!raw.startsWith(PRICE_INLINE_PREFIX)) return next()

  const query = raw.slice(PRICE_INLINE_PREFIX.length).trim()
  if (query.length < MIN_QUERY_LENGTH) {
    await ctx.answerInlineQuery([], { cache_time: 0 })
    return
  }

  let printings: PricePrinting[] = []
  try {
    printings = await findPrintings(query)
  } catch (err) {
    console.error('Price inline search failed:', err)
  }

  const results: InlineQueryResultArticle[] = printings
    .slice(0, MAX_INLINE_RESULTS)
    .map((printing) => {
      const state: PriceState = { scryfallId: printing.id, language: 'all', foil: false }

      return {
        type: 'article',
        id: printing.id,
        title: buildInlineTitle(printing),
        description: buildInlineDescription(printing),
        thumbnail_url: printing.thumbnailUrl ?? undefined,
        input_message_content: {
          message_text: buildPriceText(printing, state, 'pending'),
          parse_mode: 'HTML',
          link_preview_options: artPreview(printing.imageUrl)
        },
        reply_markup: buildPriceKeyboard(printing, state, null, false)
      }
    })

  await ctx.answerInlineQuery(results, { cache_time: results.length ? INLINE_CACHE_SECONDS : 0 })
}

// A plain callback handler (not a Menu): the whole state travels in callback_data, so there is no
// registration-order dependency on bot.use(commands). A press re-renders the same message, which
// for an inline message is addressed by inline_message_id (grammY's editMessageText handles it).
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

    const cardtrader = await fetchCardtrader(printing, state)
    await ctx.editMessageText(buildPriceText(printing, state, cardtrader), {
      parse_mode: 'HTML',
      link_preview_options: artPreview(printing.imageUrl),
      reply_markup: buildPriceKeyboard(printing, state, cardtrader?.url ?? null)
    })
    await ctx.answerCallbackQuery()
  } catch (err) {
    await answerEditError(ctx, err)
  }
}

export function registerPrezzoCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Before the commander picker's catch-all inline handler, which answers every other query
  bot.on('inline_query', handlePriceInlineQuery)
  bot.on('callback_query:data', handlePriceButton)
  commands.command(
    'prezzo',
    'Prezzo di una carta su CardMarket e CardTrader — es. /prezzo Lightning Bolt',
    prezzoCommandHandler
  )
}
