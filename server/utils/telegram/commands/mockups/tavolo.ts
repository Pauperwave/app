// server\utils\telegram\commands\mockups\tavolo.ts
// /tavolo dispatches to the live table the linked associate sits at: a 1v1 (matchReport.ts) or a
// Commander pod (commanderReport.ts) in a round being played. With neither there is no fallback:
// mock data stays inside the hidden demo command (mockups/commanderDemo.ts).
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { replyWithLiveTable } from '../tournaments/matchReport'
import { replyWithLiveCommanderPod } from '../tournaments/commanderPod'
import { registerDeepLink } from '../../deepLinks'
import { ICONS } from '../../icons'

const NO_LIVE_TABLE_TEXT = `${ICONS.table} Nessun tavolo aperto al momento per te — controlla di essere iscritto a un torneo in corso.`

// Extracted for reuse by t.me/<bot>?start=tavolo (deepLinks.ts); meant to be opened from a QR code
// at the physical table
async function tavoloCommandHandler(ctx: Context) {
  if (await replyWithLiveTable(ctx)) return
  if (await replyWithLiveCommanderPod(ctx)) return
  await ctx.reply(NO_LIVE_TABLE_TEXT)
}

registerDeepLink('tavolo', tavoloCommandHandler)

export function registerTavoloCommand(bot: Bot, commands: CommandGroup<Context>) {
  commands.command('tavolo', 'Tavolo e avversario del turno', tavoloCommandHandler)
}
