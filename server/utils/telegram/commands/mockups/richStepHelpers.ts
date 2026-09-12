// server\utils\telegram\commands\mockups\richStepHelpers.ts

// Shared by risultato.ts's (Commander) and risultato1v1.ts's own
// step-by-step result wizards — extracted 2026-09-12 after fallow flagged
// both files independently defining byte-identical copies of these.
import type { Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'

// editMessageText only replaces reply_markup when one is passed explicitly
// — it won't clear a stale inline keyboard just because the new content is
// a rich_message instead of plain text.
export function editRichMessage(ctx: Context, message: InputRichMessage) {
  return ctx.editMessageText(message, { reply_markup: { inline_keyboard: [] } })
}

// editMessageText and answerCallbackQuery are independent Telegram API
// calls — awaiting them sequentially adds a full extra round-trip of
// perceived latency to every tap for no reason, so they run concurrently.
export function showRichStep(ctx: Context, message: InputRichMessage) {
  return Promise.all([editRichMessage(ctx, message), ctx.answerCallbackQuery()])
}

// "Categoria / Valore" fact table shared by both wizards' own final-summary
// screens — one row per fact instead of a paragraph of arrow-separated lines.
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
