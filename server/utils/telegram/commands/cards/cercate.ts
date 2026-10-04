// server\utils\telegram\commands\cards\cercate.ts
import type { Bot, Context } from 'grammy'

import {
  buildWantedCardRow,
  wantedChoiceFor
} from '#shared/utils/wantedCards/wantedCardRow'

import { answerEditError, answerLoadError } from '../callbackErrors'
import { NOT_LINKED_MESSAGE, resolveAssociateUuidByChatId } from '../account/linking'
import {
  FOUND_CALLBACK_PREFIX,
  REMOVE_CALLBACK_PREFIX,
  WANT_CALLBACK_PREFIX,
  decodeFoundState,
  decodeRemoveState,
  decodeWantState,
  wantedLanguageOf,
  type PriceLanguage,
  type PriceState
} from './priceCard'
import { editPriceMessage } from './prezzo'
import { fetchScryfallCard } from './scryfall'
import { findActiveWantedCard } from './wantedLookup'

import { resolveCardTraderBlueprint } from '../../../cardTrader'
import { ICONS } from '~~/server/utils/telegram/icons'

const NOT_FOUND_TEXT = `${ICONS.thinking} Non trovo più questa carta.`
const ALREADY_WANTED_TEXT = `${ICONS.info} È già nel tuo elenco.`
const GONE_TEXT = 'Questa carta non è più nel tuo elenco.'

const LANGUAGE_LABELS: Record<PriceLanguage, string> = { all: 'qualsiasi lingua', it: 'ITA', en: 'ENG' }

// Telegram user id and private chat id are the same number, and chats are linked to an associate in
// the private chat, so the person who pressed the button is who gets the card (also for an inline
// message posted in a group, which has no chat of its own for this update)
async function handleWantButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(WANT_CALLBACK_PREFIX)) return next()

  const state = decodeWantState(data)
  // fallow-ignore-next-line code-duplication -- callback guard mirrors the other /cercate handler
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

    const choice = wantedChoiceFor(card, {
      language: wantedLanguageOf(state.language),
      foil: state.foil,
      copies: 1
    })
    const supabase = telegramServiceSupabaseClient()

    if (await findActiveWantedCard(supabase, associateUuid, card.id, choice)) {
      await refreshPriceMessage(ctx, state)
      await ctx.answerCallbackQuery({ text: ALREADY_WANTED_TEXT, show_alert: true })
      return
    }

    const { error } = await supabase
      .from('pauperwave_wanted_cards')
      .insert(buildWantedCardRow(card, associateUuid, choice, new Date()))
    if (error) throw error

    // Warms the CardTrader cache like the website's create endpoint does; failure is silent, the
    // on-demand resolve retries
    const token = useRuntimeConfig().cardTraderApiToken
    if (token) resolveCardTraderBlueprint(supabase, token, card.id, card.set).catch(() => {})

    // The button turns into "already among your wanted cards", with found and remove beside it
    await refreshPriceMessage(ctx, state)

    const finish = choice.foil ? ' · foil' : ''
    await ctx.answerCallbackQuery({
      text: `${ICONS.success} Aggiunta alle tue carte cercate:\n${card.name} (${card.set.toUpperCase()}) · ${LANGUAGE_LABELS[state.language]}${finish}`,
      show_alert: true
    })
  } catch (err) {
    console.error('Adding a wanted card from the bot failed:', err)
    await answerLoadError(ctx)
  }
}

// Redraws the price message so its wanted-card buttons match what was just done. The action itself
// already happened: a message that can't be redrawn (an identical one, or one no longer editable)
// must not turn it into an error alert.
async function refreshPriceMessage(ctx: Context, state: PriceState) {
  try {
    await editPriceMessage(ctx, state)
  } catch (err) {
    console.error('Redrawing the price message after a wanted card change failed:', err)
  }
}

// "Found" and "remove" act on the associate's own row for the printing, language and finish the
// message shows; the row is found again from the state, no row id travels in callback_data
async function changeWantedCard(ctx: Context, state: PriceState | null, action: 'found' | 'remove') {
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

    const supabase = telegramServiceSupabaseClient()
    const row = await findActiveWantedCard(supabase, associateUuid, state.scryfallId, {
      language: wantedLanguageOf(state.language),
      foil: state.foil
    })

    let toast = GONE_TEXT
    if (row) {
      const changes = action === 'found'
        ? { status: 'found', updated_by: associateUuid }
        : { deleted_at: new Date().toISOString(), deleted_by: associateUuid }

      const { error } = await supabase
        .from('pauperwave_wanted_cards')
        .update(changes)
        .eq('id', row.id)
        .eq('player_associate_uuid', associateUuid)
      if (error) throw error

      toast = action === 'found'
        ? `${ICONS.found} Segnata come trovata.`
        : `${ICONS.trash} Tolta dalle tue carte cercate.`
    }

    await refreshPriceMessage(ctx, state)
    await ctx.answerCallbackQuery({ text: toast })
  } catch (err) {
    console.error('Changing a wanted card from the bot failed:', err)
    await answerEditError(ctx, err)
  }
}

async function handleFoundButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(FOUND_CALLBACK_PREFIX)) return next()

  await changeWantedCard(ctx, decodeFoundState(data), 'found')
}

async function handleRemoveButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(REMOVE_CALLBACK_PREFIX)) return next()

  await changeWantedCard(ctx, decodeRemoveState(data), 'remove')
}

export function registerCercateHandlers(bot: Bot) {
  bot.on('callback_query:data', handleWantButton)
  bot.on('callback_query:data', handleFoundButton)
  bot.on('callback_query:data', handleRemoveButton)
}
