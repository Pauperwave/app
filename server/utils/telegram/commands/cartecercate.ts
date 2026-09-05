// server\utils\telegram\commands\cartecercate.ts
import { InlineKeyboard } from 'grammy'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { resolveAssociateUuidByChatId, NOT_LINKED_MESSAGE } from './linking'
import { answerLoadError, editOrResendMessage } from './callbackErrors'
import type { Bot, Context } from 'grammy'

type WantedCardStatus = 'searching' | 'found' | 'abandoned'

interface WantedCardRow {
  uuid: string
  card_name: string
  copies: number
  requested_at: string | null
  status: WantedCardStatus
  image_url: string | null
  scryfall_url: string | null
  player_associate_uuid: string
  associate: { first_name: string | null, last_name: string | null } | null
}

const SELECT_COLUMNS = `
  uuid, card_name, copies, requested_at, status, image_url, scryfall_url,
  player_associate_uuid, associate:pauperwave_associates!player_associate_uuid(first_name, last_name)
`

const PAGE_SIZE = 10

// Telegram photo captions cap at 1024 characters (vs. 4096 for plain text
// messages) — only relevant when the detail is sent as a photo (image_url
// set), same constraint as tournament/detail.ts's own truncateForCaption.
const CAPTION_LIMIT = 1024

function truncateForCaption(text: string): string {
  if (text.length <= CAPTION_LIMIT) return text
  return `${text.slice(0, CAPTION_LIMIT - 1)}…`
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

// Short token carried through callback_data (64-byte cap, same reasoning as
// tournament/detail.ts's own origin encoding) — 'a'/'m' + page number.
function encodeOrigin(scope: Scope, page: number): string {
  return `${scope === 'mine' ? 'm' : 'a'}${page}`
}

function decodeOrigin(origin: string): { scope: Scope, page: number } {
  return { scope: origin.startsWith('m') ? 'mine' : 'all', page: Number(origin.slice(1)) }
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

// Player name is only useful in the 'all' scope — every row in 'mine' is
// the viewer's own, repeating their own name on every line adds nothing.
function cardLine(row: WantedCardRow, scope: Scope): string {
  const copies = row.copies > 1 ? ` x${row.copies}` : ''
  const player = scope === 'all' && row.associate
    ? ` — ${row.associate.first_name} ${row.associate.last_name}`
    : ''
  return `${STATUS_ICON[row.status]} ${row.card_name}${copies}${player}`
}

function listMessage(rows: WantedCardRow[], scope: Scope): string {
  const header = scope === 'mine' ? '🔍 *Le mie carte cercate*' : '🔍 *Carte cercate*'
  if (!rows.length) {
    const empty = scope === 'mine' ? 'Nessuna richiesta registrata.' : 'Nessuna carta cercata al momento.'
    return `${header}\n\n${empty}`
  }
  const lines = rows.map(row => cardLine(row, scope))
  return `${header}\n\n${lines.join('\n')}\n\n👇 Tocca una carta per i dettagli`
}

function listKeyboard(
  rows: WantedCardRow[], scope: Scope, page: number, hasNext: boolean
): InlineKeyboard {
  const keyboard = new InlineKeyboard()

  if (page > 0 || hasNext) {
    const navRow = keyboard.row()
    if (page > 0) navRow.text('◀ Pagina prec.', `cartecercate:${encodeOrigin(scope, page - 1)}`)
    if (hasNext) navRow.text('Pagina succ. ▶', `cartecercate:${encodeOrigin(scope, page + 1)}`)
  }

  for (const row of rows) {
    const label = `${STATUS_ICON[row.status]} ${row.card_name}`.slice(0, 64)
    keyboard.row().text(label, `carta:${row.uuid}:${encodeOrigin(scope, page)}`)
  }

  keyboard.row().text(
    scope === 'mine' ? '🌐 Tutte le carte' : '👤 Solo le mie carte',
    `cartecercate:${encodeOrigin(scope === 'mine' ? 'all' : 'mine', 0)}`
  )

  return keyboard
}

async function renderList(
  scope: Scope, page: number, chatId: number
): Promise<{ text: string, keyboard: InlineKeyboard }> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const { rows, hasNext } = await fetchWantedCardsPage(scope, page, associateUuid)
  return { text: listMessage(rows, scope), keyboard: listKeyboard(rows, scope, page, hasNext) }
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

function cardDetailMessage(row: WantedCardRow): string {
  const date = row.requested_at ? format(new Date(row.requested_at), 'd MMM yyyy', { locale: it }) : null
  const player = row.associate ? `${row.associate.first_name} ${row.associate.last_name}` : 'Socio sconosciuto'
  const copies = row.copies > 1 ? ` x${row.copies}` : ''
  const name = row.scryfall_url ? `[${row.card_name}](${row.scryfall_url})` : row.card_name

  const lines = [
    `${STATUS_ICON[row.status]} *${name}*${copies}`,
    '',
    `👤 Richiesta da: ${player}`,
    `📌 Stato: ${STATUS_LABEL[row.status]}`
  ]
  if (date) lines.push(`🗓️ Richiesta il: ${date}`)
  return lines.join('\n')
}

// Only the requester themselves can manage their own request from the bot —
// mirrors requireManagementOrWantedCardOwner (server/utils/wantedCards.ts,
// 2026-09-05): the bot has no notion of the web app's management role for a
// chat, so ownership is the only check available here.
function isOwnCard(row: WantedCardRow, associateUuid: string | null): boolean {
  return associateUuid !== null && row.player_associate_uuid === associateUuid
}

function cardDetailKeyboard(row: WantedCardRow, origin: string, isOwner: boolean): InlineKeyboard {
  const keyboard = new InlineKeyboard()

  if (isOwner) {
    for (const status of Object.keys(STATUS_LABEL) as WantedCardStatus[]) {
      if (status === row.status) continue
      keyboard.row().text(`${STATUS_ICON[status]} Segna: ${STATUS_LABEL[status]}`, `cstatus:${row.uuid}:${status}:${origin}`)
    }
    keyboard.row().text('🗑️ Elimina richiesta', `cdelete:${row.uuid}:${origin}`)
  }

  const { scope, page } = decodeOrigin(origin)
  keyboard.row().text('« Torna all\'elenco', `cartecercate:${encodeOrigin(scope, page)}`)
  return keyboard
}

function deleteConfirmKeyboard(uuid: string, origin: string): InlineKeyboard {
  return new InlineKeyboard()
    .row().text('❗ Conferma eliminazione', `cdeleteok:${uuid}:${origin}`)
    .row().text('« Annulla', `carta:${uuid}:${origin}`)
}

async function renderCardDetail(
  uuid: string, origin: string, chatId: number
): Promise<{ row: WantedCardRow, text: string, keyboard: InlineKeyboard } | null> {
  const row = await fetchWantedCard(uuid)
  if (!row) return null

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  return {
    row,
    text: cardDetailMessage(row),
    keyboard: cardDetailKeyboard(row, origin, isOwnCard(row, associateUuid))
  }
}

// The message being replaced is always a text one here (the list) — a
// photo tournament/detail.ts-style can't be edited into via editMessageText,
// but it doesn't need to be: this only ever opens a detail view fresh, never
// refreshes an existing photo one (that's refreshCardDetail below).
async function openCardDetail(
  ctx: Context, row: WantedCardRow, text: string, keyboard: InlineKeyboard
) {
  if (row.image_url) {
    await ctx.deleteMessage().catch(() => {})
    await ctx.replyWithPhoto(row.image_url, {
      caption: truncateForCaption(text),
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  } else {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true }
    })
  }
}

// Re-renders an already-open detail message in place (after a status change,
// or to show the delete confirm) — the message may already be a photo one
// (image_url set), so this edits the caption instead of the text, same
// distinction as tournament/detail.ts's own refreshDetailMessage.
async function refreshCardDetail(
  ctx: Context, row: WantedCardRow, text: string, keyboard: InlineKeyboard
) {
  if (row.image_url) {
    await ctx.editMessageCaption({ caption: truncateForCaption(text), parse_mode: 'Markdown', reply_markup: keyboard })
  } else {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true }
    })
  }
}

export function registerCarteCercateCommand(bot: Bot) {
  bot.command('cartecercate', async (ctx) => {
    try {
      const { text, keyboard } = await renderList('all', 0, ctx.chat.id)
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare le carte cercate, riprova più tardi.')
    }
  })

  bot.callbackQuery(/^cartecercate:([am]\d+)$/, async (ctx) => {
    const originToken = ctx.match?.[1] as string | undefined
    const chatId = ctx.chat?.id
    if (!originToken || !chatId) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }
    const { scope, page } = decodeOrigin(originToken)

    if (scope === 'mine' && !await resolveAssociateUuidByChatId(chatId)) {
      await ctx.answerCallbackQuery({ text: NOT_LINKED_MESSAGE, show_alert: true })
      return
    }

    try {
      const { text, keyboard } = await renderList(scope, page, chatId)
      await editOrResendMessage(ctx, text, keyboard)
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })

  function cardCallbackParams(
    ctx: Context
  ): { uuid: string, origin: string, chatId: number } | null {
    const uuid = ctx.match?.[1] as string | undefined
    const origin = ctx.match?.[2] as string | undefined
    const chatId = ctx.chat?.id
    if (!uuid || !origin || !chatId) return null
    return { uuid, origin, chatId }
  }

  bot.callbackQuery(/^carta:([0-9a-f-]+):([am]\d+)$/, async (ctx) => {
    const params = cardCallbackParams(ctx)
    if (!params) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }
    const { uuid, origin, chatId } = params

    try {
      const rendered = await renderCardDetail(uuid, origin, chatId)
      if (!rendered) {
        await ctx.answerCallbackQuery({ text: 'Richiesta non trovata', show_alert: true })
        return
      }
      await openCardDetail(ctx, rendered.row, rendered.text, rendered.keyboard)
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })

  bot.callbackQuery(/^cstatus:([0-9a-f-]+):(searching|found|abandoned):([am]\d+)$/, async (ctx) => {
    const uuid = ctx.match?.[1] as string | undefined
    const status = ctx.match?.[2] as WantedCardStatus | undefined
    const origin = ctx.match?.[3] as string | undefined
    const chatId = ctx.chat?.id
    if (!uuid || !status || !origin || !chatId) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }

    try {
      const associateUuid = await resolveAssociateUuidByChatId(chatId)
      const row = await fetchWantedCard(uuid)
      if (!row || !isOwnCard(row, associateUuid)) {
        await ctx.answerCallbackQuery({ text: 'Non è una tua richiesta.', show_alert: true })
        return
      }

      const supabase = telegramServiceSupabaseClient()
      const { error } = await supabase
        .from('pauperwave_wanted_cards')
        .update({ status })
        .eq('uuid', uuid)
      if (error) throw error

      const rendered = await renderCardDetail(uuid, origin, chatId)
      if (rendered) await refreshCardDetail(ctx, rendered.row, rendered.text, rendered.keyboard)
      await ctx.answerCallbackQuery({ text: `✅ Segnata come "${STATUS_LABEL[status]}"` })
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore durante l\'aggiornamento, riprova più tardi.', show_alert: true })
    }
  })

  bot.callbackQuery(/^cdelete:([0-9a-f-]+):([am]\d+)$/, async (ctx) => {
    const params = cardCallbackParams(ctx)
    if (!params) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }
    const { uuid, origin, chatId } = params

    try {
      const associateUuid = await resolveAssociateUuidByChatId(chatId)
      const row = await fetchWantedCard(uuid)
      if (!row || !isOwnCard(row, associateUuid)) {
        await ctx.answerCallbackQuery({ text: 'Non è una tua richiesta.', show_alert: true })
        return
      }

      await refreshCardDetail(
        ctx, row,
        `${cardDetailMessage(row)}\n\n⚠️ Eliminare questa richiesta?`,
        deleteConfirmKeyboard(uuid, origin)
      )
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })

  bot.callbackQuery(/^cdeleteok:([0-9a-f-]+):([am]\d+)$/, async (ctx) => {
    const uuid = ctx.match?.[1] as string | undefined
    const origin = ctx.match?.[2] as string | undefined
    const chatId = ctx.chat?.id
    if (!uuid || !origin || !chatId) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }

    try {
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

      const { scope, page } = decodeOrigin(origin)
      const { text, keyboard } = await renderList(scope, page, chatId)
      await editOrResendMessage(ctx, text, keyboard)
      await ctx.answerCallbackQuery({ text: '🗑️ Richiesta eliminata.' })
    } catch {
      await ctx.answerCallbackQuery({ text: 'Errore durante l\'eliminazione, riprova più tardi.', show_alert: true })
    }
  })
}
