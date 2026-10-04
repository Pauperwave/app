// server\utils\telegram\commands\crediti.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InputRichMessage } from 'grammy/types'

import { registerDeepLink } from '../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

type Blocks = NonNullable<InputRichMessage['blocks']>

const SCRYFALL_URL = 'https://scryfall.com'
const CARDMARKET_URL = 'https://www.cardmarket.com'
const CARDTRADER_URL = 'https://www.cardtrader.com'

type ListItem = Extract<Blocks[number], { type: 'list' }>['items'][number]

function link(text: string, url: string) {
  return { type: 'url' as const, text, url }
}

// One bullet: a paragraph made of plain text and links
function bullet(...text: (string | ReturnType<typeof link>)[]): ListItem {
  return { blocks: [{ type: 'paragraph', text }] }
}

// Who made the bot and where its data comes from. The @username is plain text: Telegram turns it
// into a mention by itself.
export function buildCreditsMessage(siteUrl: string): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.credits} Crediti` },
      { type: 'paragraph', text: 'Il bot di Pauperwave è stato realizzato da Emanuele Nardi (@emanuelenardi).' },
      {
        type: 'list',
        items: [
          bullet('Carte e immagini vengono da ', link('Scryfall', SCRYFALL_URL)),
          bullet('Prezzi da ', link('CardMarket', CARDMARKET_URL), ' e ', link('CardTrader', CARDTRADER_URL))
        ]
      },
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
