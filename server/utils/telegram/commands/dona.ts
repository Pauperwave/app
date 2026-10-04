// server\utils\telegram\commands\dona.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InputRichMessage } from 'grammy/types'

import { registerDeepLink } from '../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

const PAYPAL_URL = 'https://paypal.me/emanuelenardi'

// A thank-you and the PayPal link to support the bot's and the site's development. The @username
// is plain text: Telegram turns it into a mention by itself.
export function buildDonationMessage(): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.heart} Supporta Pauperwave` },
      {
        type: 'paragraph',
        text: 'Grazie di essere qui! Il bot e il sito di Pauperwave sono sviluppati da Emanuele Nardi '
          + '(@emanuelenardi).'
      },
      {
        type: 'paragraph',
        text: [
          'Se ti sono utili e vuoi sostenere il lavoro dietro la loro realizzazione, puoi fare una '
          + 'donazione libera su ',
          { type: 'url', text: 'PayPal', url: PAYPAL_URL },
          '.'
        ]
      },
      { type: 'paragraph', text: 'Nessun obbligo: usarli e segnalare i problemi con /supporto è già un grande aiuto.' }
    ]
  }
}

// Extracted for reuse by t.me/<bot>?start=dona (deepLinks.ts)
async function donaCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage(buildDonationMessage())
}

registerDeepLink('dona', donaCommandHandler)

export function registerDonaCommand(commands: CommandGroup<Context>) {
  commands.command('dona', 'Sostieni lo sviluppo del bot e del sito', donaCommandHandler)
}
