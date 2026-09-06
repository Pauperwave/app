// server\utils\telegram\commands\cartecercate.ts
import { Menu } from '@grammyjs/menu'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { resolveAssociateUuidByChatId, resolveChatIdByAssociateUuid, NOT_LINKED_MESSAGE } from './linking'
import { answerLoadError } from './callbackErrors'
import { navigateBack } from '../menuNav'
import { FormattedString } from '@grammyjs/parse-mode'
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

type WantedCardStatus = 'searching' | 'found' | 'abandoned'

interface WantedCardRow {
  uuid: string
  card_name: string
  copies: number
  requested_at: string | null
  status: WantedCardStatus
  image_url: string | null
  scryfall_url: string | null
  cardmarket_price: number | null
  cardtrader_price: number | null
  player_associate_uuid: string
  associate: { first_name: string | null, last_name: string | null } | null
}

const SELECT_COLUMNS = `
  uuid, card_name, copies, requested_at, status, image_url, scryfall_url,
  cardmarket_price, cardtrader_price,
  player_associate_uuid, associate:pauperwave_associates!player_associate_uuid(first_name, last_name)
`

const PAGE_SIZE = 10

// Telegram photo captions cap at 1024 characters (vs. 4096 for plain text
// messages) — only relevant when the detail is sent as a photo (image_url
// set). .slice() (not a raw string cut) keeps entities consistent with the
// truncated text.
const CAPTION_LIMIT = 1024

function truncateForCaption(text: FormattedString): FormattedString {
  if (text.text.length <= CAPTION_LIMIT) return text
  return text.slice(0, CAPTION_LIMIT - 1).plain('…')
}

const STATUS_ICON: Record<WantedCardStatus, string> = {
  searching: '🔍',
  found: '✅',
  abandoned: '⛔'
}

const STATUS_LABEL: Record<WantedCardStatus, string> = {
  searching: 'Cerco ancora',
  found: 'Trovata',
  abandoned: 'Abbandonata'
}

type Scope = 'all' | 'mine'

// Short tokens carried through menu payloads (64-byte callback_data cap,
// same reasoning as tournament/detail.ts's own origin encoding) —
// 'a'/'m' + page number for the list, and `${uuid}:${listPayload}` for a
// card (so both the list scope/page AND the specific card survive a full
// round trip through the detail and delete-confirm menus).
function encodeListPayload(scope: Scope, page: number): string {
  return `${scope === 'mine' ? 'm' : 'a'}${page}`
}

function decodeListPayload(raw: string): { scope: Scope, page: number } {
  return { scope: raw.startsWith('m') ? 'mine' : 'all', page: Number(raw.slice(1)) }
}

function decodeCardPayload(raw: string): { uuid: string, listPayload: string } {
  const separator = raw.indexOf(':')
  return { uuid: raw.slice(0, separator), listPayload: raw.slice(separator + 1) }
}

// pauperwave_wanted_cards has no anon-read policy (only `authenticated`, see
// migration 20260807190720) — this is public data as far as the bot's
// concerned (any club member can see who's looking for what), so
// service-role read it is, same reasoning as telegramServiceSupabaseClient's
// own doc comment.
//
// 'all' scope stays fixed to status 'searching' (the active want-list);
// 'mine' shows every status for the chat's own associate so a linked user
// can review/manage requests they've already marked found/abandoned too.
// Fetches PAGE_SIZE + 1 rows to detect a next page without a separate count
// query — the extra row is dropped before rendering.
async function fetchWantedCardsPage(
  scope: Scope, page: number, associateUuid: string | null
): Promise<{ rows: WantedCardRow[], hasNext: boolean }> {
  if (scope === 'mine' && !associateUuid) return { rows: [], hasNext: false }

  const supabase = telegramServiceSupabaseClient()
  let query = supabase
    .from('pauperwave_wanted_cards')
    .select(SELECT_COLUMNS)
    .is('deleted_at', null)

  query = scope === 'mine'
    ? query.eq('player_associate_uuid', associateUuid as string)
    : query.eq('status', 'searching')

  const { data, error } = await query
    .order('requested_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (error) throw error
  const rows = data as WantedCardRow[]
  return { rows: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE }
}

// Plain (never bolded) — a list row doesn't need both, only the detail
// view's own name line ever bolds instead of linking.
function cardNameLink(row: WantedCardRow): FormattedString {
  return row.scryfall_url
    ? FormattedString.link(row.card_name, row.scryfall_url)
    : new FormattedString(row.card_name)
}

// Player name is only useful in the 'all' scope — every row in 'mine' is
// the viewer's own, repeating their own name on every line adds nothing.
function cardLine(row: WantedCardRow, scope: Scope): FormattedString {
  const copies = row.copies > 1 ? ` x${row.copies}` : ''
  const player = scope === 'all' && row.associate
    ? ` — ${row.associate.first_name} ${row.associate.last_name}`
    : ''
  return fmt`${STATUS_ICON[row.status]} ${cardNameLink(row)}${copies}${player}`
}

function listMessage(rows: WantedCardRow[], scope: Scope): FormattedString {
  const header = fmt`🔍 ${FormattedString.b(scope === 'mine' ? 'Le mie carte cercate' : 'Carte cercate')}`
  if (!rows.length) {
    const empty = scope === 'mine' ? 'Nessuna richiesta registrata.' : 'Nessuna carta cercata al momento.'
    return fmt`${header}\n\n${empty}`
  }
  const lines = rows.map(row => cardLine(row, scope))
  return fmt`${header}\n\n${FormattedString.join(lines, '\n')}\n\n👇 Tocca una carta per i dettagli`
}

// Used by both the forward list render and the back-jumps from cartaMenu/
// cartaDeleteMenu (via navigateBack) to rebuild the exact list page a card
// was opened from.
async function cartecercateText(
  scope: Scope, page: number, chatId: number
): Promise<FormattedString> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const { rows } = await fetchWantedCardsPage(scope, page, associateUuid)
  return listMessage(rows, scope)
}

async function fetchWantedCard(uuid: string): Promise<WantedCardRow | null> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .select(SELECT_COLUMNS)
    .eq('uuid', uuid)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as WantedCardRow | null
}

// requesterChatId links the name to the requester's Telegram account
// (tg://user?id=..., FormattedString.mentionUser) when they have one linked
// — resolved by the caller (resolveChatIdByAssociateUuid), since this stays
// a pure sync function otherwise.
function cardDetailMessage(row: WantedCardRow, requesterChatId: number | null): FormattedString {
  const date = row.requested_at ? format(new Date(row.requested_at), 'd MMM yyyy', { locale: it }) : null
  const playerName = row.associate ? `${row.associate.first_name} ${row.associate.last_name}` : 'Socio sconosciuto'
  const player = requesterChatId
    ? FormattedString.mentionUser(playerName, requesterChatId)
    : playerName
  const copies = row.copies > 1 ? ` x${row.copies}` : ''
  const name = row.scryfall_url ? cardNameLink(row) : FormattedString.b(row.card_name)

  const lines: (FormattedString | string)[] = [
    fmt`${STATUS_ICON[row.status]} ${name}${copies}`,
    '',
    fmt`👤 Richiesta da: ${player}`,
    `📌 Stato: ${STATUS_LABEL[row.status]}`
  ]
  if (date) lines.push(`🗓️ Richiesta il: ${date}`)
  if (row.cardmarket_price !== null) lines.push(`💶 Cardmarket: ${row.cardmarket_price} €`)
  if (row.cardtrader_price !== null) lines.push(`💶 CardTrader: ${row.cardtrader_price} €`)
  return FormattedString.join(lines, '\n')
}

// Only the requester themselves can manage their own request from the bot —
// mirrors requireManagementOrWantedCardOwner (server/utils/wantedCards.ts,
// 2026-09-05): the bot has no notion of the web app's management role for a
// chat, so ownership is the only check available here.
function isOwnCard(row: WantedCardRow, associateUuid: string | null): boolean {
  return associateUuid !== null && row.player_associate_uuid === associateUuid
}

// ---- cartecercateMenu (list, paginated) ------------------------------

// autoAnswer: false — the "open card" buttons navigate into cartaMenu via a
// dedicated handler that answers itself once the detail is drawn.
const cartecercateMenu = new Menu<Context>('cc', { autoAnswer: false }).dynamic(async (ctx, range) => {
  const chatId = ctx.chat?.id
  if (!chatId) return
  const { scope, page } = decodeListPayload((ctx.match as string | undefined) ?? 'a0')

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const { rows, hasNext } = await fetchWantedCardsPage(scope, page, associateUuid)

  if (page > 0 || hasNext) {
    const navRow = range.row()
    if (page > 0) {
      navRow.text({ text: '◀ Pagina prec.', payload: encodeListPayload(scope, page - 1) }, openList)
    }
    if (hasNext) {
      navRow.text({ text: 'Pagina succ. ▶', payload: encodeListPayload(scope, page + 1) }, openList)
    }
  }

  for (const row of rows) {
    const label = `${STATUS_ICON[row.status]} ${row.card_name}`.slice(0, 64)
    const cardPayload = `${row.uuid}:${encodeListPayload(scope, page)}`
    range.row().submenu({ text: label, payload: cardPayload }, 'cd', openCard)
  }

  const otherScope = scope === 'mine' ? 'all' : 'mine'
  range.row().text(
    {
      text: scope === 'mine' ? '🌐 Tutte le carte' : '👤 Solo le mie carte',
      payload: encodeListPayload(otherScope, 0)
    },
    openList
  )
})

// Shared by the pagination buttons and the "solo le mie/tutte" toggle —
// both just mean "show the list at this scope/page", differing only in
// whether the chat needs to be linked (only true when the target is
// 'mine'), same gate the original single callback handler applied to both.
async function openList(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  const { scope, page } = decodeListPayload(ctx.match)
  if (scope === 'mine' && !await resolveAssociateUuidByChatId(chatId)) {
    await ctx.answerCallbackQuery({ text: NOT_LINKED_MESSAGE, show_alert: true })
    return
  }

  try {
    const text = await cartecercateText(scope, page, chatId)
    await ctx.editMessageText(text.text, {
      entities: text.entities,
      reply_markup: cartecercateMenu,
      link_preview_options: { is_disabled: true }
    })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// ---- cartaMenu (card detail) ------------------------------------------

async function openCard(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const { uuid } = decodeCardPayload(ctx.match)
    const row = await fetchWantedCard(uuid)
    if (!row) {
      await ctx.answerCallbackQuery({ text: 'Richiesta non trovata', show_alert: true })
      return
    }

    const requesterChatId = await resolveChatIdByAssociateUuid(row.player_associate_uuid)
    const text = cardDetailMessage(row, requesterChatId)

    if (row.image_url) {
      await ctx.deleteMessage().catch(() => {})
      const capped = truncateForCaption(text)
      await ctx.replyWithPhoto(row.image_url, {
        caption: capped.caption,
        caption_entities: capped.caption_entities,
        reply_markup: cartaMenu
      })
    } else {
      await ctx.editMessageText(text.text, {
        entities: text.entities,
        reply_markup: cartaMenu,
        link_preview_options: { is_disabled: true }
      })
    }
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// autoAnswer: false — status-change/delete/back all answer with their own
// confirmation or error text.
const cartaMenu = new Menu<Context>('cd', { autoAnswer: false }).dynamic(async (ctx, range) => {
  const chatId = ctx.chat?.id
  const raw = ctx.match as string | undefined
  if (!chatId || !raw) return
  const { uuid } = decodeCardPayload(raw)

  const row = await fetchWantedCard(uuid)
  if (!row) return

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (isOwnCard(row, associateUuid)) {
    for (const status of Object.keys(STATUS_LABEL) as WantedCardStatus[]) {
      if (status === row.status) continue
      range.row().text(
        { text: `${STATUS_ICON[status]} Segna: ${STATUS_LABEL[status]}`, payload: raw },
        ctx => changeStatus(ctx, status)
      )
    }
    range.row().submenu({ text: '🗑️ Elimina richiesta', payload: raw }, 'cx', openDeleteConfirm)
  }

  range.row().back({ text: '« Torna all\'elenco', payload: raw }, backToList)
})

async function changeStatus(ctx: Context & { match: string }, status: WantedCardStatus) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const { uuid } = decodeCardPayload(ctx.match)
    const associateUuid = await resolveAssociateUuidByChatId(chatId)
    const row = await fetchWantedCard(uuid)
    if (!row || !isOwnCard(row, associateUuid)) {
      await ctx.answerCallbackQuery({ text: 'Non è una tua richiesta.', show_alert: true })
      return
    }

    const supabase = telegramServiceSupabaseClient()
    const { error } = await supabase.from('pauperwave_wanted_cards').update({ status }).eq('uuid', uuid)
    if (error) throw error

    const requesterChatId = await resolveChatIdByAssociateUuid(row.player_associate_uuid)
    const text = cardDetailMessage({ ...row, status }, requesterChatId)
    if (row.image_url) {
      const capped = truncateForCaption(text)
      await ctx.editMessageCaption({
        caption: capped.caption,
        caption_entities: capped.caption_entities,
        reply_markup: cartaMenu
      })
    } else {
      await ctx.editMessageText(text.text, {
        entities: text.entities,
        reply_markup: cartaMenu,
        link_preview_options: { is_disabled: true }
      })
    }
    await ctx.answerCallbackQuery({ text: `✅ Segnata come "${STATUS_LABEL[status]}"` })
  } catch {
    await ctx.answerCallbackQuery({ text: 'Errore durante l\'aggiornamento, riprova più tardi.', show_alert: true })
  }
}

async function backToList(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const { listPayload } = decodeCardPayload(ctx.match)
    const { scope, page } = decodeListPayload(listPayload)
    await navigateBack(ctx, async () => ({
      payload: listPayload,
      menu: cartecercateMenu,
      text: await cartecercateText(scope, page, chatId)
    }))
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// ---- cartaDeleteMenu (delete confirmation) -----------------------------

async function openDeleteConfirm(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const { uuid } = decodeCardPayload(ctx.match)
    const associateUuid = await resolveAssociateUuidByChatId(chatId)
    const row = await fetchWantedCard(uuid)
    if (!row || !isOwnCard(row, associateUuid)) {
      await ctx.answerCallbackQuery({ text: 'Non è una tua richiesta.', show_alert: true })
      return
    }

    const requesterChatId = await resolveChatIdByAssociateUuid(row.player_associate_uuid)
    const text = fmt`${cardDetailMessage(row, requesterChatId)}\n\n⚠️ Eliminare questa richiesta?`
    if (row.image_url) {
      const capped = truncateForCaption(text)
      await ctx.editMessageCaption({
        caption: capped.caption,
        caption_entities: capped.caption_entities,
        reply_markup: cartaDeleteMenu
      })
    } else {
      await ctx.editMessageText(text.text, {
        entities: text.entities,
        reply_markup: cartaDeleteMenu,
        link_preview_options: { is_disabled: true }
      })
    }
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// autoAnswer: false — confirm/cancel both answer with their own text.
const cartaDeleteMenu = new Menu<Context>('cx', { autoAnswer: false }).dynamic((ctx, range) => {
  const raw = ctx.match as string | undefined
  if (!raw) return
  range.row().text({ text: '❗ Conferma eliminazione', payload: raw }, confirmDelete)
  range.row().back({ text: '« Annulla', payload: raw }, cancelDelete)
})

async function confirmDelete(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const { uuid, listPayload } = decodeCardPayload(ctx.match)
    const associateUuid = await resolveAssociateUuidByChatId(chatId)
    const row = await fetchWantedCard(uuid)
    if (!row || !isOwnCard(row, associateUuid)) {
      await ctx.answerCallbackQuery({ text: 'Non è una tua richiesta.', show_alert: true })
      return
    }

    // Soft delete (deleted_at), same convention as delete.post.ts —
    // no deleted_by here, the bot has no auth.users id to stamp, only a
    // chat_id/associate_uuid.
    const supabase = telegramServiceSupabaseClient()
    const { error } = await supabase
      .from('pauperwave_wanted_cards')
      .update({ deleted_at: new Date().toISOString() })
      .eq('uuid', uuid)
    if (error) throw error

    const { scope, page } = decodeListPayload(listPayload)
    await navigateBack(ctx, async () => ({
      payload: listPayload,
      menu: cartecercateMenu,
      text: await cartecercateText(scope, page, chatId)
    }))
    await ctx.answerCallbackQuery({ text: '🗑️ Richiesta eliminata.' })
  } catch {
    await ctx.answerCallbackQuery({ text: 'Errore durante l\'eliminazione, riprova più tardi.', show_alert: true })
  }
}

async function cancelDelete(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const raw = ctx.match
    const { uuid } = decodeCardPayload(raw)
    await navigateBack(ctx, async () => {
      const row = await fetchWantedCard(uuid)
      if (!row) throw new Error('Wanted card not found')
      const requesterChatId = await resolveChatIdByAssociateUuid(row.player_associate_uuid)
      return { payload: raw, menu: cartaMenu, text: cardDetailMessage(row, requesterChatId) }
    })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

const CARTECERCATE_DESCRIPTION = 'Carte cercate dai soci (paginato, gestisci le tue)'

export function registerCarteCercateCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time, not module top level — same circular-import
  // reasoning as calendario.ts's own comment, though here all three menus
  // live in this one file, so it's just kept consistent with that pattern
  // rather than strictly necessary.
  cartecercateMenu.register(cartaMenu)
  cartaMenu.register(cartaDeleteMenu)
  bot.use(cartecercateMenu)

  commands.command('cartecercate', CARTECERCATE_DESCRIPTION, async (ctx) => {
    try {
      const text = await cartecercateText('all', 0, ctx.chat.id)
      await ctx.reply(text.text, {
        entities: text.entities,
        reply_markup: cartecercateMenu,
        link_preview_options: { is_disabled: true }
      })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare le carte cercate, riprova più tardi.')
    }
  })
}
