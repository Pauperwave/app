// server\utils\telegram\commands\tournaments\commanderReport.ts
// Real Commander pod flow in Telegram: comandante, posizione, uccisioni, voti, drop. It replaced
// the mockup (mockups/tavolo.ts's MOCK_TABLE + mockups/risultato.ts, now a hidden demo in
// mockups/demo.ts), keeping its user flow but writing every pick immediately.
//
// This file only wires the pieces together, in the order their handlers must run:
//   commanderPod.ts          the table message, its menu and the live-pod lookup
//   commanderPicker.ts       setting the commander (inline search, partners, history)
//   commanderResultWizard.ts position -> kills -> votes -> summary
//   commanderDrop.ts         /drop and the drop buttons
//   commanderPodMessages.ts  every rich message and callback prefix they share
import type { Bot } from 'grammy'

import { commanderPodMenu } from './commanderPod'
import { registerCommanderPickerHandlers } from './commanderPicker'
import { registerCommanderResultHandlers } from './commanderResultWizard'
import { registerCommanderDropHandlers } from './commanderDrop'

export function registerCommanderReportHandlers(bot: Bot) {
  bot.use(commanderPodMenu)

  registerCommanderPickerHandlers(bot)
  registerCommanderResultHandlers(bot)
  registerCommanderDropHandlers(bot)
}
