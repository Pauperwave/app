// server\utils\telegram\commands\tournaments\commanderReport.ts
// Real (non-mockup) Commander pod flow in Telegram: comandante, posizione, uccisioni, voti, drop.
// It replaced the old mockup flow (mockups/tavolo.ts's MOCK_TABLE + mockups/risultato.ts), which
// moved to a hidden demo command (mockups/commanderDemo.ts). The user flow is deliberately the
// mockup's (2026-09-24); the difference is that every pick writes immediately.
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
