// server\utils\telegram\commands\turni.ts
import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { registerDeepLink } from '../deepLinks'

// Not a @grammyjs/menu Menu — a single static button opening a Mini App
// needs no submenu/dynamic-range features, same reasoning as core.ts's
// statusKeyboard().
function turniKeyboard(): InlineKeyboard {
  const siteUrl = useRuntimeConfig().public.siteUrl
  return new InlineKeyboard().webApp('🔢 Apri contatore turni', `${siteUrl}/telegram/turni`)
}

// MTG rule: se il tempo scade (50 minuti) e la partita non è ancora finita,
// si gioca il turno corrente più 5 turni aggiuntivi — questa mini-app è solo
// il contatore di quei 5 turni, tenuto dai giocatori al tavolo. Nessuno
// stato lato server: il conteggio vive nella pagina stessa (vedi
// app/pages/telegram/turni.vue), si azzera se la si chiude.
async function turniCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage(
    { markdown: '⏱️ Quando scade il tempo, usa questo contatore per tenere traccia dei 5 turni aggiuntivi.' },
    { reply_markup: turniKeyboard() }
  )
}

registerDeepLink('turni', turniCommandHandler)

export function registerTurniCommand(commands: CommandGroup<Context>) {
  commands.command('turni', 'Contatore dei turni aggiuntivi a fine tempo', turniCommandHandler)
}
