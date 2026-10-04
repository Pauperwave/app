// server\utils\telegram\commands\crediti.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InputRichMessage } from 'grammy/types'

import { registerDeepLink } from '../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

// Who made the bot and where its data comes from. The @username is plain text: Telegram turns it
// into a mention by itself.
export function buildCreditsMessage(siteUrl: string): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.credits} Crediti` },
      { type: 'paragraph', text: 'Il bot di Pauperwave è stato realizzato da Emanuele Nardi (@emanuelenardi).' },
      { type: 'paragraph', text: 'Carte e immagini vengono da Scryfall, i prezzi da CardMarket e CardTrader.' },
      { type: 'paragraph', text: `Il sito dell'associazione: ${siteUrl}` }
    ]
  }
}

// Extracted for reuse by t.me/<bot>?start=crediti (deepLinks.ts)
async function creditiCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage(buildCreditsMessage(useRuntimeConfig().public.siteUrl))
}

registerDeepLink('crediti', creditiCommandHandler)

export function registerCreditiCommand(commands: CommandGroup<Context>) {
  commands.command('crediti', 'Chi ha realizzato il bot', creditiCommandHandler)
}
