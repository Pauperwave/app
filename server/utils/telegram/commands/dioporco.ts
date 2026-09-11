// server\utils\telegram\commands\dioporco.ts
import type { Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { registerDeepLink } from '../deepLinks'

// Ilharg, the Raze-Boar (WAR 133) — a literal "Boar God" creature type, so
// the pun with the Italian "dioporco" (dio + porco) writes itself. Art crop
// only (not the full card), hardcoded rather than fetched live from
// Scryfall — a one-off easter egg command has no need to track reprints,
// price, or legality. https://api.scryfall.com/cards/war/133
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
    { type: 'paragraph', text: 'Ora torna in te e usa /help per vedere i comandi disponibili.' }
  ]
}

// Extracted so it can be reused verbatim by t.me/<bot>?start=dioporco —
// see deepLinks.ts.
async function dioporcoCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage({ blocks: dioporcoBlocks() })
}

registerDeepLink('dioporco', dioporcoCommandHandler)

export function registerDioporcoCommand(commands: CommandGroup<Context>) {
  commands.command('dioporco', 'Sfogati un po\'', dioporcoCommandHandler)
}
