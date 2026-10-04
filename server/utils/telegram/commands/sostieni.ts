// server\utils\telegram\commands\sostieni.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InputRichMessage } from 'grammy/types'

import { registerDeepLink } from '../deepLinks'
import { encodeHelpBtn } from '../helpButton'
import { ICONS } from '~~/server/utils/telegram/icons'

const PAYPAL_URL = 'https://paypal.me/emanuelenardi'

// A thank-you with a PayPal button on the left and, on the right, a button opening the /supporto
// flow. The @username is plain text: Telegram turns it into a mention by itself.
export function buildSupportMessage(): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.heart} Sostieni Pauperwave` },
      {
        type: 'paragraph',
        text: 'Grazie di essere qui! Il bot e il sito di Pauperwave sono sviluppati da Emanuele Nardi '
          + '(@emanuelenardi).'
      },
      {
        type: 'paragraph',
        text: 'Se ti sono utili e vuoi sostenere il lavoro dietro la loro realizzazione, puoi fare una '
          + 'donazione libera su PayPal.'
      },
      { type: 'paragraph', text: 'Nessun obbligo: usarli e segnalare i problemi è già un grande aiuto.' },
      {
        type: 'buttons',
        buttons: [
          { text: `${ICONS.heart} PayPal`, url: PAYPAL_URL },
          { text: `${ICONS.support} Scrivi al supporto`, callback_data: encodeHelpBtn('supporto') }
        ]
      }
    ]
  }
}

// Extracted for reuse by t.me/<bot>?start=sostieni (deepLinks.ts)
async function sostieniCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage(buildSupportMessage())
}

registerDeepLink('sostieni', sostieniCommandHandler)

export function registerSostieniCommand(commands: CommandGroup<Context>) {
  commands.command('sostieni', 'Sostieni lo sviluppo del bot e del sito', sostieniCommandHandler)
}
