// server\utils\telegram\commands\mazzi.ts
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
  const header = '🃏 *I tuoi mazzi Commander*'
  if (!decks.length) return `${header}\n\nNon hai ancora nessun mazzo Commander registrato.`

  const lines = decks.map((deck) => {
    const commanders = deck.commander_2_name
      ? `${deck.commander_1_name} / ${deck.commander_2_name}`
      : deck.commander_1_name
    const companion = deck.companion_name ? `\n  Companion: ${deck.companion_name}` : ''
    const decklist = deck.decklist_url ? `\n  🔗 ${deck.decklist_url}` : ''
    return `• ${commanders}${companion}${decklist}`
  })

  return `${header}\n\n${lines.join('\n\n')}`
}

export function registerMazziCommand(bot: Bot) {
  bot.command('mazzi', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId) return

    try {
      const associateUuid = await resolveAssociateUuidByChatId(chatId)
      if (!associateUuid) {
        await ctx.reply('Devi prima collegare il tuo account: scrivimi la tua email da socio.')
        return
      }

      const decks = await fetchMyDecks(associateUuid)
      await ctx.reply(mazziMessage(decks), { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tuoi mazzi, riprova più tardi.')
    }
  })
}
