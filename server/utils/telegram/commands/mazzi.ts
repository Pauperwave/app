// server\utils\telegram\commands\mazzi.ts
import { requireLinkedAssociate } from './linking'
import type { Bot } from 'grammy'
import { FormattedString } from '@grammyjs/parse-mode'

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

function mazziMessage(decks: CommanderDeckRow[]): FormattedString {
  const header = fmt`🃏 ${FormattedString.b('I tuoi mazzi Commander')}`
  if (!decks.length) {
    return fmt`${header}\n\nNon hai ancora nessun mazzo Commander registrato.`
  }

  const lines = decks.map((deck) => {
    const commanders = deck.commander_2_name
      ? `${deck.commander_1_name} / ${deck.commander_2_name}`
      : deck.commander_1_name
    const companion = deck.companion_name ? fmt`\n  Companion: ${deck.companion_name}` : ''
    // A real link entity (FormattedString.link), not just autolinked plain
    // text — renders the same way, but doesn't depend on Telegram's own URL
    // pattern detection recognizing the string.
    const decklist = deck.decklist_url
      ? fmt`\n  🔗 ${FormattedString.link(deck.decklist_url, deck.decklist_url)}`
      : ''
    return fmt`• ${commanders}${companion}${decklist}`
  })

  return fmt`${header}\n\n${FormattedString.join(lines, '\n\n')}`
}

export function registerMazziCommand(bot: Bot) {
  bot.command('mazzi', async (ctx) => {
    try {
      const associateUuid = await requireLinkedAssociate(ctx)
      if (!associateUuid) return

      const decks = await fetchMyDecks(associateUuid)
      const message = mazziMessage(decks)
      await ctx.reply(message.text, {
        entities: message.entities,
        link_preview_options: { is_disabled: true }
      })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare i tuoi mazzi, riprova più tardi.')
    }
  })
}
