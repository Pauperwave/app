// server\utils\telegram\commands\mockups\tavolo.ts
// /tavolo dispatches to whichever live table the linked associate actually
// sits at: a 1v1 (tournaments/matchReport.ts) or a Commander pod
// (tournaments/commanderReport.ts) in a round being played. Neither found
// means no fallback anymore — see mockups/commanderDemo.ts for the demo
// flow this used to fall back to unconditionally (2026-09-24, user request:
// mock data should never show up outside its own hidden demo command).
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { replyWithLiveTable } from '../tournaments/matchReport'
import { replyWithLiveCommanderPod } from '../tournaments/commanderReport'
import { registerDeepLink } from '../../deepLinks'

const NO_LIVE_TABLE_TEXT = '🪑 Nessun tavolo aperto al momento per te — controlla di essere iscritto a un torneo in corso.'

// Extracted so it can be reused verbatim by t.me/<bot>?start=tavolo — see
// deepLinks.ts. Intended entry point: a QR code at the physical table,
// scanned mid-round instead of typing /tavolo cold.
async function tavoloCommandHandler(ctx: Context) {
  if (await replyWithLiveTable(ctx)) return
  if (await replyWithLiveCommanderPod(ctx)) return
  await ctx.reply(NO_LIVE_TABLE_TEXT)
}

registerDeepLink('tavolo', tavoloCommandHandler)

export function registerTavoloCommand(bot: Bot, commands: CommandGroup<Context>) {
  commands.command('tavolo', 'Tavolo e avversario del turno', tavoloCommandHandler)
}
