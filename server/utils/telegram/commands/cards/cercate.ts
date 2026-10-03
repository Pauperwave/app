// server\utils\telegram\commands\cards\cercate.ts
import type { Bot, Context } from 'grammy'

import { answerLoadError } from '../callbackErrors'
import { NOT_LINKED_MESSAGE, resolveAssociateUuidByChatId } from '../account/linking'
import { WANT_CALLBACK_PREFIX, decodeWantState, effectiveFoil, type PriceLanguage } from './priceCard'
import { fetchScryfallCard, toPrinting } from './scryfall'
import { buildWantedCardRow, isAlreadyWanted } from './wantedRow'

import { resolveCardTraderBlueprint } from '../../../cardTrader'

const NOT_FOUND_TEXT = '🤔 Non trovo più questa carta.'
const ALREADY_WANTED_TEXT = 'ℹ️ È già nel tuo elenco.'

const LANGUAGE_LABELS: Record<PriceLanguage, string> = { all: 'qualsiasi lingua', it: 'ITA', en: 'ENG' }

// Telegram user id and private chat id are the same number, and chats are linked to an associate in
// the private chat, so the person who pressed the button is who gets the card (also for an inline
// message posted in a group, which has no chat of its own for this update)
async function handleWantButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  const state = data ? decodeWantState(data) : null
  if (!data?.startsWith(WANT_CALLBACK_PREFIX)) return next()

  if (!state || !ctx.from) {
    await ctx.answerCallbackQuery()
    return
  }

  try {
    const associateUuid = await resolveAssociateUuidByChatId(ctx.from.id)
    if (!associateUuid) {
      await ctx.answerCallbackQuery({ text: NOT_LINKED_MESSAGE, show_alert: true })
      return
    }

    const card = await fetchScryfallCard(state.scryfallId)
    if (!card) {
      await ctx.answerCallbackQuery({ text: NOT_FOUND_TEXT, show_alert: true })
      return
    }

    const printing = toPrinting(card)
    const choice = { language: state.language, foil: effectiveFoil(printing, state) }
    const supabase = telegramServiceSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('pauperwave_wanted_cards')
      .select('language, treatment')
      .eq('player_associate_uuid', associateUuid)
      .eq('scryfall_id', card.id)
      .eq('status', 'searching')
      .is('deleted_at', null)
    if (existingError) throw existingError

    if (isAlreadyWanted(existing ?? [], choice)) {
      await ctx.answerCallbackQuery({ text: ALREADY_WANTED_TEXT, show_alert: true })
      return
    }

    const { error } = await supabase
      .from('pauperwave_wanted_cards')
      .insert(buildWantedCardRow(card, printing, associateUuid, choice, new Date()))
    if (error) throw error

    // Warms the CardTrader cache like the website's create endpoint does; failure is silent, the
    // on-demand resolve retries
    const token = useRuntimeConfig().cardTraderApiToken
    if (token) resolveCardTraderBlueprint(supabase, token, card.id, card.set).catch(() => {})

    const finish = choice.foil ? ' · foil' : ''
    const language = LANGUAGE_LABELS[choice.language]
    await ctx.answerCallbackQuery({
      text: `✅ Aggiunta alle tue cercate:\n${card.name} (${card.set.toUpperCase()}) · ${language}${finish}`,
      show_alert: true
    })
  } catch (err) {
    console.error('Adding a wanted card from the bot failed:', err)
    await answerLoadError(ctx)
  }
}

export function registerCercateHandlers(bot: Bot) {
  bot.on('callback_query:data', handleWantButton)
}
