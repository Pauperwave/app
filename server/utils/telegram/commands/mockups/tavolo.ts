// server\utils\telegram\commands\mockups\tavolo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InlineQueryResultArticle } from 'grammy/types'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { risultatoMenu, openRisultato } from './risultato'

// MOCKUP — tournament_pairings has no live-write flow yet (see
// docs/architecture/telegram-bot.md), so this is hardcoded sample data
// standing in for a real pairing lookup, to preview the intended UX.
const MOCK_TABLE = {
  number: 7,
  opponents: ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi']
}

function tavoloMessage(): FormattedString {
  const lines = MOCK_TABLE.opponents.map(name => `• ${name}`)
  return fmt`🪑 ${FormattedString.b(`Tavolo ${MOCK_TABLE.number}`)}\n\nGiochi con:\n${FormattedString.join(lines, '\n')}\n\n👇🏻 Imposta il tuo comandante per questo turno`
}

// Scryfall requires a descriptive User-Agent — same convention as
// priceRefresh.ts's own, duplicated since the two call sites are unrelated.
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (Telegram bot commander search; contact: emanuelenardi.dev@gmail.com)'

const MAX_COMMANDER_RESULTS = 5

interface ScryfallCard {
  name: string
  type_line?: string
  image_uris?: { small?: string }
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
  // Puts the input field into inline mode on this chat (requires BotFather:
  // /setinline) — bot.on('inline_query') answers live as the user types.
  range.switchInlineCurrent('🎴 Imposta comandante', '')

  // Opens risultato.ts's own flow (position + kills) — user request,
  // 2026-09-07: a single entry point into result-reporting from the table
  // view itself, instead of a separate /risultato command to remember.
  range.row().submenu({ text: '📋 Inserisci risultati', payload: '' }, 'ris', openRisultato)
})

export function registerTavoloCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time — same circular-import reasoning as
  // calendario.ts's own comment (risultato.ts has no back-reference to
  // tavolo.ts today, but registering here keeps the convention consistent).
  tavoloMenu.register(risultatoMenu)
  bot.use(tavoloMenu)

  commands.command('tavolo', 'Tavolo e avversario del turno', async (ctx) => {
    const text = tavoloMessage()
    await ctx.reply(text.text, { entities: text.entities, reply_markup: tavoloMenu })
  })

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
    await ctx.reply(`✅ Comandante impostato per questo turno: ${name}`)
  })
}
