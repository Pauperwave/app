// server\utils\telegram\commands\cartecercate.ts
import type { Bot } from 'grammy'

interface WantedCardRow {
  card_name: string
  copies: number
  requested_at: string | null
  associate: { first_name: string | null, last_name: string | null } | null
}

const MAX_CARDS = 10

// pauperwave_wanted_cards has no anon-read policy (only `authenticated`,
// see migration 20260807190720) — this is public data as far as the bot's
// concerned (any club member can see who's looking for what), so
// service-role read it is, same reasoning as telegramServiceSupabaseClient's
// own doc comment.
async function wantedCardsMessage(): Promise<string> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .select('card_name, copies, requested_at, associate:pauperwave_associates!player_associate_uuid(first_name, last_name)')
    .is('deleted_at', null)
    .eq('status', 'searching')
    .order('requested_at', { ascending: false })
    .limit(MAX_CARDS)

  if (error) throw error
  if (!data.length) return '🔍 Nessuna carta cercata al momento.'

  const lines = (data as WantedCardRow[]).map((row) => {
    const copies = row.copies > 1 ? ` x${row.copies}` : ''
    const player = row.associate ? ` — ${row.associate.first_name} ${row.associate.last_name}` : ''
    return `• ${row.card_name}${copies}${player}`
  })

  return `🔍 *Carte cercate*\n\n${lines.join('\n')}`
}

export function registerCarteCercateCommand(bot: Bot) {
  bot.command('cartecercate', async (ctx) => {
    const message = await wantedCardsMessage()
      .catch(() => '⚠️ Non sono riuscito a recuperare le carte cercate, riprova più tardi.')
    await ctx.reply(message, { parse_mode: 'Markdown' })
  })
}
