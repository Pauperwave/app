// server\utils\telegram\commands\cards\elenco.ts
import type { Bot, Context, InlineKeyboard } from 'grammy'
import { GrammyError } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'

import { answerLoadError } from '../callbackErrors'
import { NOT_LINKED_MESSAGE, resolveAssociateUuidByChatId } from '../account/linking'
import { registerDeepLink } from '../../deepLinks'
import { artPreview, buildPriceRichMessage } from './priceCard'
import { fetchCardtrader, fetchPrinting } from './prezzo'
import {
  WANTED_LIST_CALLBACK_PREFIX,
  WANTED_LIST_PAGE_SIZE,
  buildRowActionsKeyboard,
  buildRowActionsText,
  buildWantedListKeyboard,
  buildWantedListText,
  decodeWantedListCallback,
  pageCount,
  priceStateOf,
  type WantedListRow
} from './wantedList'
import { ICONS } from '~~/server/utils/telegram/icons'

// /cercate: the associate's own active wanted cards (status 'searching'), a page at a time. A
// number opens that card's actions: mark it found, or remove it. Removal is a soft delete like the
// site's, so an admin can restore it from the trash.

const COLUMNS = 'id, scryfall_id, card_name, set_code, language, treatment, copies, cardmarket_price, image_url'
const PRIVATE_ONLY_TEXT = 'Apri /cercate in privato con me: l\'elenco è personale.'

// An HTML message (the list, or the plain question) or a rich one (a card's detail)
type View
  = | { text: string, keyboard?: InlineKeyboard, imageUrl?: string | null }
    | { rich: InputRichMessage, keyboard: InlineKeyboard }

type Supabase = ReturnType<typeof telegramServiceSupabaseClient>

function activeRows(supabase: Supabase, associateUuid: string) {
  return supabase
    .from('pauperwave_wanted_cards')
    .select(COLUMNS, { count: 'exact' })
    .eq('player_associate_uuid', associateUuid)
    .eq('status', 'searching')
    .is('deleted_at', null)
    .order('id', { ascending: false })
}

// A page past the end (the last row of a page was just removed) falls back to the last one
async function fetchPage(supabase: Supabase, associateUuid: string, requestedPage: number) {
  const fetchRange = async (page: number) => {
    const from = page * WANTED_LIST_PAGE_SIZE
    const { data, count, error } = await activeRows(supabase, associateUuid)
      .range(from, from + WANTED_LIST_PAGE_SIZE - 1)
    if (error) throw error
    return { rows: (data ?? []) as WantedListRow[], total: count ?? 0 }
  }

  const first = await fetchRange(requestedPage)
  const lastPage = pageCount(first.total) - 1
  if (requestedPage <= lastPage) return { ...first, page: requestedPage }

  return { ...(await fetchRange(lastPage)), page: lastPage }
}

async function renderPage(supabase: Supabase, associateUuid: string, requestedPage: number) {
  const { rows, total, page } = await fetchPage(supabase, associateUuid, requestedPage)

  return {
    text: buildWantedListText(rows, page, total),
    keyboard: total > 0 ? buildWantedListKeyboard(rows, page, total) : undefined
  }
}

async function elencoCommandHandler(ctx: Context) {
  if (ctx.chat?.type !== 'private') {
    await ctx.reply(PRIVATE_ONLY_TEXT)
    return
  }

  const associateUuid = ctx.chat ? await resolveAssociateUuidByChatId(ctx.chat.id) : null
  if (!associateUuid) {
    await ctx.reply(NOT_LINKED_MESSAGE)
    return
  }

  const { text, keyboard } = await renderPage(telegramServiceSupabaseClient(), associateUuid, 0)
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
}

registerDeepLink('cercate', elencoCommandHandler)

async function fetchOwnRow(supabase: Supabase, associateUuid: string, id: number) {
  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .select(COLUMNS)
    .eq('id', id)
    .eq('player_associate_uuid', associateUuid)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data as WantedListRow | null
}

// The card's detail: a rich message with the same prices as the "€ name" one, for the row's
// printing, language and finish. Without a printing to look up (or if Scryfall fails) it falls back
// to the plain question.
async function buildRowDetail(row: WantedListRow, page: number): Promise<View> {
  const keyboard = buildRowActionsKeyboard(row, page)
  const fallback = { text: buildRowActionsText(row), keyboard, imageUrl: row.image_url }
  if (!row.scryfall_id) return fallback

  try {
    const printing = await fetchPrinting(row.scryfall_id)
    if (!printing) return fallback

    const state = priceStateOf(row, row.scryfall_id)
    const cardtrader = await fetchCardtrader(printing, state)

    const withArt = { ...printing, imageUrl: printing.imageUrl ?? row.image_url }
    return { rich: buildPriceRichMessage(withArt, state, cardtrader, 'detail'), keyboard }
  } catch (err) {
    console.error('/cercate price lookup failed:', err)
    return fallback
  }
}

async function handleListButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(WANTED_LIST_CALLBACK_PREFIX)) return next()

  const callback = decodeWantedListCallback(data)
  // fallow-ignore-next-line code-duplication -- callback guard mirrors the other /cercate handler
  if (!callback || !ctx.from) {
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
    let toast: string | undefined
    let view: View | null = null

    if (callback.action !== 'list' && callback.id !== null) {
      // Only the owner's own rows are ever read or touched
      const row = await fetchOwnRow(supabase, associateUuid, callback.id)

      if (callback.action === 'ask' && row) {
        view = await buildRowDetail(row, callback.page)
      } else if (callback.action === 'found' && row) {
        const { error } = await supabase
          .from('pauperwave_wanted_cards')
          .update({ status: 'found', updated_by: associateUuid })
          .eq('id', row.id)
          .eq('player_associate_uuid', associateUuid)
        if (error) throw error
        toast = `${ICONS.found} Segnata come trovata.`
      } else if (callback.action === 'remove' && row) {
        const { error } = await supabase
          .from('pauperwave_wanted_cards')
          .update({ deleted_at: new Date().toISOString(), deleted_by: associateUuid })
          .eq('id', row.id)
          .eq('player_associate_uuid', associateUuid)
        if (error) throw error
        toast = `${ICONS.trash} Tolta dalle tue cercate.`
      } else {
        toast = 'Questa carta non è più nel tuo elenco.'
      }
    }

    view ??= await renderPage(supabase, associateUuid, callback.page)
    if ('rich' in view) {
      await ctx.editMessageText(view.rich, { reply_markup: view.keyboard })
    } else {
      await ctx.editMessageText(view.text, {
        parse_mode: 'HTML',
        link_preview_options: artPreview(view.imageUrl ?? null),
        reply_markup: view.keyboard
      })
    }
    await ctx.answerCallbackQuery({ text: toast })
  } catch (err) {
    // Pressing a button whose view is already shown re-renders identical content: not a failure
    if (err instanceof GrammyError && err.description.includes('message is not modified')) {
      await ctx.answerCallbackQuery()
      return
    }
    console.error('/cercate failed:', err)
    await answerLoadError(ctx)
  }
}

export function registerElencoCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.on('callback_query:data', handleListButton)
  commands.command('cercate', 'Le carte che cerchi: vedi e togli', async (ctx) => {
    try {
      await elencoCommandHandler(ctx)
    } catch (err) {
      console.error('/cercate failed:', err)
      await ctx.reply(`${ICONS.warning} Non riesco a caricare l'elenco adesso. Riprova tra poco.`)
    }
  })
}
