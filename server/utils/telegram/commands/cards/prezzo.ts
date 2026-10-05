// server\utils\telegram\commands\cards\prezzo.ts
import type { Bot, Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InlineQueryResultArticle } from 'grammy/types'
import type { ScryfallCard } from '#shared/types/scryfall'

import { answerEditError } from '../callbackErrors'
import { resolveAssociateUuidByChatId } from '../account/linking'
import { registerDeepLink } from '../../deepLinks'
import { findActiveWantedCard } from './wantedLookup'
import {
  PRICE_CALLBACK_PREFIX,
  PRICE_INLINE_PREFIX,
  buildInlineDescription,
  buildInlineTitle,
  buildPriceRichMessage,
  buildWantedKeyboard,
  decodePriceState,
  effectiveFoil,
  sortByCardmarketPrice,
  wantedLanguageOf,
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
import { ICONS } from '~~/server/utils/telegram/icons'

const NOT_FOUND_TEXT = `${ICONS.thinking} Non trovo questa carta. Scrivi il nome inglese, es. /prezzo Lightning Bolt.`
const PRICE_PROMPT = 'Scrivi il nome della carta per scegliere la stampa, es. Lightning Bolt: rispondi a questo messaggio.'

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

export async function fetchPrinting(scryfallId: string): Promise<PricePrinting | null> {
  const card = await fetchScryfallCard(scryfallId)
  return card ? toPrinting(card) : null
}

// Null when CardTrader can't be asked (no token) or fails: the message then says "non disponibile"
export async function fetchCardtrader(
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
registerDeepLink('prezzo', promptForName)

// A forced reply, so the next message is the card name: the bot has no memory between updates, the
// prompt text itself is what recognizes the answer (see registerPrezzoCommand)
function promptForName(ctx: Context) {
  return ctx.reply(PRICE_PROMPT, {
    reply_markup: { force_reply: true, input_field_placeholder: 'Lightning Bolt' }
  })
}

function offerPrintingPicker(ctx: Context, query: string) {
  return ctx.reply(`${ICONS.card} Scegli la stampa di «${query}» per vederne il prezzo.`, {
    reply_markup: new InlineKeyboard()
      .switchInlineCurrent(`${ICONS.searchPrint} Scegli la stampa`, `${PRICE_INLINE_PREFIX} ${query}`)
  })
}

async function prezzoCommandHandler(ctx: Context) {
  const query = (ctx.match as string | undefined)?.trim()
  if (!query) {
    await promptForName(ctx)
    return
  }

  await offerPrintingPicker(ctx, query)
}

// Before bot.use(commands) and the linking catch-all: it only acts on a reply to its own prompt
async function handlePriceNameReply(ctx: Context, next: () => Promise<void>) {
  const text = ctx.message?.text?.trim()
  const repliesToPrompt = ctx.message?.reply_to_message?.text === PRICE_PROMPT
  if (!text || text.startsWith('/') || !repliesToPrompt) return next()

  await offerPrintingPicker(ctx, text)
}

// Inline mode, "€ <name>": one result per printing. The posted message already carries the
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
          rich_message: buildPriceRichMessage(printing, state, 'pending', 'inline')
        },
        reply_markup: buildWantedKeyboard(printing, state)
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
    if (!await editPriceMessage(ctx, state)) {
      await ctx.answerCallbackQuery({ text: NOT_FOUND_TEXT, show_alert: true })
      return
    }

    await ctx.answerCallbackQuery()
  } catch (err) {
    await answerEditError(ctx, err)
  }
}

// Whether whoever opened the message already has this printing, language and finish among their
// wanted cards. A chat not linked to an associate, or a failed lookup, just shows the add button.
async function isAmongWantedCards(
  ctx: Context,
  printing: PricePrinting,
  state: PriceState
): Promise<boolean> {
  if (!ctx.from) return false

  try {
    const associateUuid = await resolveAssociateUuidByChatId(ctx.from.id)
    if (!associateUuid) return false

    const row = await findActiveWantedCard(
      telegramServiceSupabaseClient(),
      associateUuid,
      printing.id,
      { language: wantedLanguageOf(state.language), foil: effectiveFoil(printing, state) }
    )
    return row !== null
  } catch (err) {
    console.error('Wanted card lookup for the price message failed:', err)
    return false
  }
}

// Renders the price message again for this state, with the wanted-card buttons that fit it. False
// when the printing no longer exists on Scryfall.
export async function editPriceMessage(ctx: Context, state: PriceState): Promise<boolean> {
  const printing = await fetchPrinting(state.scryfallId)
  if (!printing) return false

  const [cardtrader, wanted] = await Promise.all([
    fetchCardtrader(printing, state),
    isAmongWantedCards(ctx, printing, state)
  ])
  await ctx.editMessageText(buildPriceRichMessage(printing, state, cardtrader, 'inline'), {
    reply_markup: buildWantedKeyboard(printing, state, wanted)
  })
  return true
}

// The inline result is posted with "Tutte" already active but without CardTrader, which an inline
// result can't wait for: once the player has picked it, the message is edited with the price.
// Needs inline feedback enabled for the bot in BotFather (/setinlinefeedback).
async function handleChosenPrice(ctx: Context, next: () => Promise<void>) {
  const chosen = ctx.chosenInlineResult
  if (!chosen?.query.startsWith(PRICE_INLINE_PREFIX)) return next()

  try {
    await editPriceMessage(ctx, { scryfallId: chosen.result_id, language: 'all', foil: false })
  } catch (err) {
    console.error('CardTrader price after the inline pick failed:', err)
  }
}

export function registerPrezzoCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Before the commander picker's catch-all inline handler, which answers every other query
  bot.on('inline_query', handlePriceInlineQuery)
  bot.on('chosen_inline_result', handleChosenPrice)
  bot.on('callback_query:data', handlePriceButton)
  bot.on('message:text', handlePriceNameReply)
  commands.command(
    'prezzo',
    'Prezzo di una carta su CardMarket e CardTrader',
    prezzoCommandHandler
  )
}
