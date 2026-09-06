// server\utils\telegram\commands\tavolo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { answerLoadError } from './callbackErrors'

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
}

// is:commander — Scryfall's own filter for "can be your commander" (legendary
// creatures plus the handful of cards with explicit commander-eligibility
// text), not just any legendary. Live lookup for now (2026-09-06, mockup) —
// a future version will curate this list directly in Supabase instead of
// depending on Scryfall at request time, per user request.
async function searchCommanders(query: string): Promise<string[]> {
  try {
    const response = await $fetch<{ data: ScryfallCard[] }>('https://api.scryfall.com/cards/search', {
      query: { q: `${query} is:commander game:paper`, unique: 'cards', order: 'name' },
      headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
    })
    return (response.data ?? []).slice(0, MAX_COMMANDER_RESULTS).map(card => card.name)
  } catch {
    // /cards/search answers 404 when nothing matches — normal for a search,
    // not an error worth surfacing differently from "no results".
    return []
  }
}

// ForceReply guarantees Telegram sends the user's next message as a reply to
// this exact one — same stateless pattern as supporto.ts's own prompt (no
// in-memory "waiting for this chat" flag, Nitro is serverless).
const COMMANDER_PROMPT = 'Scrivimi il nome (anche parziale) del tuo comandante.'

// autoAnswer: false — the button below answers itself.
// onMenuOutdated: false — see calendario.ts's calendarioMenu for why.
const tavoloMenu = new Menu<Context>('tv', { autoAnswer: false, onMenuOutdated: false }).dynamic((_ctx, range) => {
  range.text('🎴 Imposta comandante', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(COMMANDER_PROMPT, { reply_markup: { force_reply: true } })
  })
})

// Every result button shares the same payload (the search query itself) —
// dynamic() only needs it to re-run the same search and rebuild an identical
// button set; each button's own handler already closes over its own
// candidate name from this same loop, so nothing needs decoding from
// ctx.match at press time.
const commanderMenu = new Menu<Context>('cmd', { autoAnswer: false, onMenuOutdated: false }).dynamic(async (ctx, range) => {
  const query = ctx.match as string | undefined
  if (!query) return

  const results = await searchCommanders(query)
  if (!results.length) {
    range.text('Nessun risultato — riprova con /tavolo', async (ctx) => {
      await ctx.answerCallbackQuery()
    })
    return
  }

  for (const name of results) {
    range.row().text({ text: name.slice(0, 64), payload: query }, async (ctx) => {
      try {
        // MOCKUP — a real implementation would persist this against the
        // player's current pairing once tournament_pairings has a live-write
        // flow (see docs/architecture/telegram-bot.md).
        await ctx.editMessageText(`✅ Comandante impostato per questo turno: ${name}`)
        await ctx.answerCallbackQuery()
      } catch {
        await answerLoadError(ctx)
      }
    })
  }
})

export function registerTavoloCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(tavoloMenu)
  bot.use(commanderMenu)

  commands.command('tavolo', 'Tavolo e avversario del turno', async (ctx) => {
    const text = tavoloMessage()
    await ctx.reply(text.text, { entities: text.entities, reply_markup: tavoloMenu })
  })

  // Registered before linking.ts's own catch-all (commands/index.ts keeps
  // that one last) — same reasoning as supporto.ts's own reply handler.
  bot.on('message:text', async (ctx, next) => {
    if (ctx.message.reply_to_message?.text !== COMMANDER_PROMPT) {
      return next()
    }

    const query = ctx.message.text.trim()
    ctx.match = query
    await ctx.reply(`🔍 Risultati per "${query}":`, { reply_markup: commanderMenu })
  })
}
