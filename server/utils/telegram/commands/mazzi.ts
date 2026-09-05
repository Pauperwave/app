// server\utils\telegram\commands\mazzi.ts
import { requireLinkedAssociate } from './linking'
import type { Bot } from 'grammy'

interface CommanderDeckRow {
  uuid: string
  commander_1_name: string
  commander_2_name: string | null
  companion_name: string | null
  decklist_url: string | null
}

async function fetchMyDecks(associateUuid: string): Promise<CommanderDeckRow[]> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('commander_decks')
    .select('uuid, commander_1_name, commander_2_name, companion_name, decklist_url, players!inner(associate_uuid)')
    .eq('players.associate_uuid', associateUuid)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as CommanderDeckRow[]
}

function mazziMessage(decks: CommanderDeckRow[]): string {
  const header = `🃏 ${mdBold('I tuoi mazzi Commander')}`
  if (!decks.length) {
    return `${header}\n\n${escapeMd('Non hai ancora nessun mazzo Commander registrato.')}`
  }

  const lines = decks.map((deck) => {
    const commanders = deck.commander_2_name
      ? `${deck.commander_1_name} / ${deck.commander_2_name}`
      : deck.commander_1_name
    const companion = deck.companion_name ? `\n  ${escapeMd(`Companion: ${deck.companion_name}`)}` : ''
    // mdLink, not escapeMd — this is a bare URL, and Telegram autolinks it
    // regardless of parse_mode, but the raw string still has to survive
    // MarkdownV2 parsing first; a URL often contains '_'/'.'/'-', which
    // would otherwise be read as stray formatting characters or break
    // parsing outright. Escaped link *text* renders clean (Telegram
    // unescapes it for display), so wrapping url→url is safe and clickable.
    const decklist = deck.decklist_url ? `\n  🔗 ${mdLink(deck.decklist_url, deck.decklist_url)}` : ''
    return `• ${escapeMd(commanders)}${companion}${decklist}`
  })

  return `${header}\n\n${lines.join('\n\n')}`
}

export function registerMazziCommand(bot: Bot) {
  bot.command('mazzi', async (ctx) => {
    try {
      const associateUuid = await requireLinkedAssociate(ctx)
      if (!associateUuid) return

      const decks = await fetchMyDecks(associateUuid)
      await ctx.reply(mazziMessage(decks), { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tuoi mazzi, riprova più tardi.')
    }
  })
}
