// server\utils\telegram\commands\turni.ts
import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { registerDeepLink } from '../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

// Not a @grammyjs/menu Menu: one static button opening a Mini App needs no submenu/dynamic features
// (like core.ts's statusKeyboard)
function turniKeyboard(): InlineKeyboard {
  const siteUrl = useRuntimeConfig().public.siteUrl
  return new InlineKeyboard().webApp(`${ICONS.numbers} Apri contatore turni`, `${siteUrl}/telegram/turni`)
}

// MTG rule: when time runs out (50 minutes) and the game isn't over, the current turn plus 5 more
// are played; this mini-app is just the counter for those 5 turns. No server-side state: the count
// lives in the page (app/pages/telegram/turni.vue) and resets when it is closed.
async function turniCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage(
    { markdown: `${ICONS.stopwatch} Quando scade il tempo, usa questo contatore per tenere traccia dei 5 turni aggiuntivi.` },
    { reply_markup: turniKeyboard() }
  )
}

registerDeepLink('turni', turniCommandHandler)

export function registerTurniCommand(commands: CommandGroup<Context>) {
  commands.command('turni', 'Contatore dei turni aggiuntivi a fine tempo', turniCommandHandler)
}
