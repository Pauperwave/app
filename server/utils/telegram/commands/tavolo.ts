// server\utils\telegram\commands\tavolo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InlineQueryResultArticle } from 'grammy/types'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

// MOCKUP (2026-09-06, user request) — tournament_pairings has no live-write
// flow yet (docs/architecture/telegram-bot.md's own note on why /tavolo was
// previously a blocked stub), so table/opponents are hardcoded sample data
// standing in for what a real pairing lookup would return, to preview the
// intended UX before that backend piece exists. Replace with a real query
// once organizers can generate live pairings.
const MOCK_TABLE = {
  number: 7,
  opponents: ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi']
}

function tavoloMessage(): FormattedString {
  const lines = MOCK_TABLE.opponents.map(name => `• ${name}`)
  return fmt`🪑 ${FormattedString.b(`Tavolo ${MOCK_TABLE.number}`)}\n\nGiochi con:\n${FormattedString.join(lines, '\n')}\n\n👇 Imposta il tuo comandante per questo turno`
}

// Scryfall API usage guidelines require a descriptive User-Agent identifying
// the app — same convention as priceRefresh.ts's own SCRYFALL_USER_AGENT,
// duplicated here rather than shared since the two call sites are otherwise
// unrelated (price lookups vs. commander name search).
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (Telegram bot commander search; contact: emanuelenardi.dev@gmail.com)'

const MAX_COMMANDER_RESULTS = 5

interface ScryfallCard {
  name: string
  type_line?: string
  image_uris?: { small?: string }
}

// is:commander — Scryfall's own filter for "can be your commander" (legendary
// creatures plus the handful of cards with explicit commander-eligibility
// text), not just any legendary. Live lookup for now (2026-09-06, mockup) —
// a future version will curate this list directly in Supabase instead of
// depending on Scryfall at request time, per user request.
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

// Prefix marking a message as "this is a commander pick coming from the
// inline-query result below", not user-typed text — checked in the
// message:text handler further down. Distinctive enough not to collide with
// anything a player would type on their own.
const COMMANDER_MESSAGE_PREFIX = '🎴 Comandante: '

// autoAnswer: false — not needed here (no callback_query handler on this
// menu at all, switchInlineCurrent is a client-side-only button that never
// triggers one), kept only for consistency with every other menu in this
// bot. onMenuOutdated: false — see calendario.ts's calendarioMenu for why.
const tavoloMenu = new Menu<Context>('tv', { autoAnswer: false, onMenuOutdated: false }).dynamic((_ctx, range) => {
  // Puts the user's input field into inline mode scoped to *this* chat —
  // requires Inline Mode enabled for the bot (BotFather: /setinline).
  // Telegram calls bot.on('inline_query') live as they type (debounced on
  // Telegram's own side), no ForceReply/ForceReply-matching round trip
  // needed like supporto.ts's prompt.
  range.switchInlineCurrent('🎴 Imposta comandante', '')
})

export function registerTavoloCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(tavoloMenu)

  commands.command('tavolo', 'Tavolo e avversario del turno', async (ctx) => {
    const text = tavoloMessage()
    await ctx.reply(text.text, { entities: text.entities, reply_markup: tavoloMenu })
  })

  bot.on('inline_query', async (ctx) => {
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

  // Picking an inline result posts it as a normal message in this chat (a
  // private chat with the bot) — recognized here by its own marker prefix
  // rather than subscribing to chosen_inline_result (which would also
  // require BotFather's /setinlinefeedback, unnecessary for a private
  // 1:1 chat where the resulting message already reaches the bot).
  // Registered before linking.ts's own catch-all (commands/index.ts keeps
  // that one last) — same reasoning as supporto.ts's own reply handler.
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
