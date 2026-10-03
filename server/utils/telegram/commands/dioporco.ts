// server\utils\telegram\commands\dioporco.ts
import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import { encodeHelpBtn } from './core'
import { registerDeepLink } from '../deepLinks'

// Ilharg, the Raze-Boar (WAR 133): a literal "Boar God", hence the pun on "dioporco". Art crop
// only, hardcoded since a one-off easter egg needn't track reprints.
// https://api.scryfall.com/cards/war/133
const ILHARG_ART_URL = 'https://cards.scryfall.io/art_crop/front/c/0/c0109b60-09aa-4a03-92e7-0c651d976d51.jpg'

function dioporcoBlocks(): InputRichMessage['blocks'] {
  return [
    { type: 'photo', photo: { type: 'photo', media: ILHARG_ART_URL } },
    { type: 'heading', size: 3, text: '🐗 DIOPORCO!' },
    {
      type: 'paragraph',
      text: 'Hai evocato Ilharg, l\'unico vero Boar God di Magic — letteralmente un "dio porco". '
        + 'Speriamo ti sia sfogato.'
    },
    { type: 'paragraph', text: 'Ora torna in te e usa /help per vedere i comandi disponibili.' },
    // Reuses core.ts's helpbtn: mechanism (handleHelpButton) instead of a separate callback_query
    // handler
    { type: 'buttons', buttons: [{ text: '📖 Help', callback_data: encodeHelpBtn('help') }] }
  ]
}

// Extracted for reuse by t.me/<bot>?start=dioporco (deepLinks.ts)
async function dioporcoCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage({ blocks: dioporcoBlocks() })
}

registerDeepLink('dioporco', dioporcoCommandHandler)

// bot.command(), not commands.command(): the CommandGroup feeds Telegram's "/" picker, so
// registering here keeps the easter egg working while staying out of that list and out of /help
export function registerDioporcoCommand(bot: Bot) {
  bot.command('dioporco', dioporcoCommandHandler)
}
