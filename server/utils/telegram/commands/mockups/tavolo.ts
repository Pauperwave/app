// server\utils\telegram\commands\mockups\tavolo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InlineQueryResultArticle, InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'

import { risultatoMenu, openRisultato } from './risultato'
import { risultato1v1Menu, openRisultato1v1 } from './risultato1v1'
import { MOCK_FORMAT, type TableFormat } from './mockPairing'
import { registerDeepLink } from '../../deepLinks'

// MOCKUP — tournament_pairings has no live-write flow yet (see
// docs/architecture/telegram-bot.md), so this is hardcoded sample data
// standing in for a real pairing lookup, to preview the intended UX.
// Opponent count differs by format (a 1v1 pairing has exactly one), hence
// a table per MOCK_FORMAT rather than one fixed opponents list.
const MOCK_TABLE_BY_FORMAT: Record<TableFormat, { number: number, opponents: string[] }> = {
  'commander': { number: 7, opponents: ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi'] },
  '1v1': { number: 3, opponents: ['Marco Rossi'] }
}

function tavoloMarkdown(): string {
  const table = MOCK_TABLE_BY_FORMAT[MOCK_FORMAT]
  // "- " (a real markdown list item), not "• " — see core.ts's HELP_TEXT
  // comment on why a plain bullet character still needs \n\n to break.
  const lines = table.opponents.map(name => `- ${name}`)
  return `## 🪑 Tavolo ${table.number}\n\nGiochi con:\n${lines.join('\n')}`
}

// Scryfall requires a descriptive User-Agent — same convention as
// priceRefresh.ts's own, duplicated since the two call sites are unrelated.
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (Telegram bot commander search; contact: emanuelenardi.dev@gmail.com)'

const MAX_COMMANDER_RESULTS = 5

interface ScryfallCard {
  name: string
  type_line?: string
  image_uris?: { small?: string, normal?: string }
  // Modal DFCs/split cards carry images per face instead of on the card
  // itself — cardImageUrl() below falls back to the front face's image.
  card_faces?: { image_uris?: { normal?: string } }[]
}

// is:commander — Scryfall's own "can be your commander" filter. A future
// version will curate this list in Supabase instead of querying Scryfall live.
async function searchCommanders(query: string): Promise<ScryfallCard[]> {
  try {
    const response = await $fetch<{ data: ScryfallCard[] }>('https://api.scryfall.com/cards/search', {
      query: { q: `${query} is:commander game:paper`, unique: 'cards', order: 'name' },
      headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
    })
    return (response.data ?? []).slice(0, MAX_COMMANDER_RESULTS)
  } catch {
    // /cards/search answers 404 when nothing matches — normal for a search,
    // not an error worth surfacing differently from "no results".
    return []
  }
}

// Exact-name lookup for the confirmation message below — the inline query
// result only round-trips the card's name through COMMANDER_MESSAGE_PREFIX,
// not its image, so the full card is re-fetched here rather than threading
// image_uris through the picked message text.
async function fetchCommanderByName(name: string): Promise<ScryfallCard | null> {
  try {
    return await $fetch<ScryfallCard>('https://api.scryfall.com/cards/named', {
      query: { exact: name },
      headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
    })
  } catch {
    return null
  }
}

function cardImageUrl(card: ScryfallCard): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null
}

// Marks a message as a commander pick from the inline-query result below
// (checked in the message:text handler), not free-typed text.
const COMMANDER_MESSAGE_PREFIX = '🎴 Comandante: '

// autoAnswer/onMenuOutdated: false — kept for consistency, though this
// menu has no callback_query handler at all (switchInlineCurrent is
// client-side-only). See calendario.ts's calendarioMenu.
const tavoloMenu = new Menu<Context>('tv', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic((_ctx, range) => {
  // Commander only — 1v1 formats have no commander to set. Puts the input
  // field into inline mode on this chat (requires BotFather: /setinline) —
  // bot.on('inline_query') answers live as the user types.
  if (MOCK_FORMAT === 'commander') {
    range.switchInlineCurrent('🎴 Imposta comandante', '')
    range.row()
  }

  // Opens risultato.ts's own Commander flow (position + kills + votes) or
  // risultato1v1.ts's own match-outcome flow, depending on MOCK_FORMAT —
  // user request 2026-09-07: a single entry point into result-reporting
  // from the table view itself, instead of a separate /risultato command
  // to remember.
  if (MOCK_FORMAT === 'commander') {
    range.submenu({ text: '✍️ Inserisci risultati', payload: '' }, 'ris', openRisultato)
  } else {
    range.submenu({ text: '✍️ Inserisci risultati', payload: '' }, 'ris1v1', openRisultato1v1)
  }
})

// ctx.api, not bot.api — @grammyjs/menu can only render a menu's
// fingerprint into reply_markup through a context's own api, not the bare
// bot-level client (confirmed 2026-09-09 in production: "Cannot send menu
// 'tv'! ... try to send it through bot.api?", @grammyjs/menu/out/menu.js's
// own inline_keyboard getter). So this still needs an update's ctx, which
// rules out a truly ctx-less server trigger (e.g. a cron job) sending this
// exact menu until the plugin supports it — it only helps today when an
// existing update wants to push to a *different* chatId than its own.
export async function pushTavoloMessage(ctx: Context, chatId: number) {
  const other = { reply_markup: tavoloMenu }
  await ctx.api.sendRichMessage(chatId, { markdown: tavoloMarkdown() }, other)
}

// Extracted so it can be reused verbatim by t.me/<bot>?start=tavolo — see
// deepLinks.ts. Intended entry point: a QR code at the physical table,
// scanned mid-round instead of typing /tavolo cold.
async function tavoloCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return
  await pushTavoloMessage(ctx, ctx.chat.id)
}

registerDeepLink('tavolo', tavoloCommandHandler)

export function registerTavoloCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time — same circular-import reasoning as
  // calendario.ts's own comment (risultato.ts has no back-reference to
  // tavolo.ts today, but registering here keeps the convention consistent).
  // Both submenu targets registered unconditionally, regardless of which
  // one MOCK_FORMAT actually renders — same reasoning as tournament/
  // detail.ts's torneoMenu being registered by all four of its parents.
  tavoloMenu.register(risultatoMenu)
  tavoloMenu.register(risultato1v1Menu)
  bot.use(tavoloMenu)

  commands.command('tavolo', 'Tavolo e avversario del turno', tavoloCommandHandler)

  bot.on('inline_query', async (ctx) => {
    // 'sender' — a private chat with the bot itself, the only place
    // switchInlineCurrent above can trigger this. Any other chat_type
    // (private with someone else, group, supergroup, channel) means this
    // came from typing "@bot ..." elsewhere, outside the /tavolo flow.
    if (ctx.inlineQuery.chat_type !== 'sender') {
      await ctx.answerInlineQuery([], { cache_time: 0 })
      return
    }

    const query = ctx.inlineQuery.query.trim()
    if (query.length < 2) {
      await ctx.answerInlineQuery([], { cache_time: 0 })
      return
    }

    const cards = await searchCommanders(query)
    const results: InlineQueryResultArticle[] = cards.map((card, index) => ({
      type: 'article',
      id: String(index),
      title: card.name,
      description: card.type_line,
      thumbnail_url: card.image_uris?.small,
      input_message_content: { message_text: `${COMMANDER_MESSAGE_PREFIX}${card.name}` }
    }))
    await ctx.answerInlineQuery(results, { cache_time: 0 })
  })

  // Picking an inline result posts it as a normal message here — recognized
  // by its marker prefix rather than subscribing to chosen_inline_result
  // (would also need BotFather's /setinlinefeedback, unnecessary in a DM).
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.message.text.startsWith(COMMANDER_MESSAGE_PREFIX)) {
      return next()
    }

    const name = ctx.message.text.slice(COMMANDER_MESSAGE_PREFIX.length)
    // MOCKUP — a real implementation would persist this against the
    // player's current pairing once tournament_pairings has a live-write
    // flow (see docs/architecture/telegram-bot.md).
    const card = await fetchCommanderByName(name)
    const imageUrl = card ? cardImageUrl(card) : null

    const blocks: InputRichMessage['blocks'] = []
    if (imageUrl) blocks.push({ type: 'photo', photo: { type: 'photo', media: imageUrl } })
    blocks.push({ type: 'paragraph', text: `✅ Comandante impostato per questo turno: ${name}` })

    await ctx.replyWithRichMessage({ blocks })
  })
}
