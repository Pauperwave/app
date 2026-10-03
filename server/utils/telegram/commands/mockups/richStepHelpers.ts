// server\utils\telegram\commands\mockups\richStepHelpers.ts

// Shared by risultato.ts's (Commander) and matchReport.ts's (1v1) step-by-step result wizards
import type { Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'

// editMessageText only replaces reply_markup when one is passed: it won't clear a stale keyboard
// when the new content is a rich_message
export function editRichMessage(ctx: Context, message: InputRichMessage) {
  return ctx.editMessageText(message, { reply_markup: { inline_keyboard: [] } })
}

// editMessageText and answerCallbackQuery are independent calls: run concurrently to avoid an extra
// round-trip per tap
export function showRichStep(ctx: Context, message: InputRichMessage) {
  return Promise.all([editRichMessage(ctx, message), ctx.answerCallbackQuery()])
}

// "Categoria / Valore" fact table for both wizards' final summaries, one row per fact
export function twoColumnFactsTable(caption: string, rows: [label: string, value: string][]) {
  const cell = (text: string) => ({ text, align: 'left' as const, valign: 'middle' as const })
  return {
    type: 'table' as const,
    is_bordered: true as const,
    is_striped: true as const,
    caption,
    cells: [
      [cell('Categoria'), cell('Valore')].map(headerCell => ({ ...headerCell, is_header: true as const })),
      ...rows.map(([label, value]) => [cell(label), cell(value)])
    ]
  }
}
