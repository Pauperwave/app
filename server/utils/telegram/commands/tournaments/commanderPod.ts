// server\utils\telegram\commands\tournaments\commanderPod.ts
// Entry point of the Commander pod flow: the table message with its buttons (/tavolo, or the deep
// link from a QR code at the table) and the lookup of the caller's own live pod, which every other
// handler of the flow starts from.
import type { Context } from 'grammy'
import { Menu } from '@grammyjs/menu'
import { opponentsText } from '#shared/utils/tournaments/playerNotificationMessages'

import { requireLinkedAssociate, resolveAssociateUuidByChatId } from '../account/linking'
import { registerDeepLink } from '../../deepLinks'
import { showRichStep } from '../mockups/richStepHelpers'
import { fetchLivePod, type LivePod } from './commanderPodData'
import { positionRichMessage } from './commanderPodMessages'
import { ICONS } from '~~/server/utils/telegram/icons'

// ─── Menu (entry point from /tavolo) ────────────────────────────────────────
// autoAnswer/onMenuOutdated: false, like tavoloMenu (mockups/tavolo.ts): every .dynamic() reads
// live data, so the staleness heuristic would false-positive
export const commanderPodMenu = new Menu<Context>('cmdpod', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic((_ctx, range) => {
  range.switchInlineCurrent(`${ICONS.commanderCard} Imposta comandante`, '')
  range.row()
  range.text(`${ICONS.write} Inserisci risultato`, async (ctx) => {
    const pod = await requirePod(ctx)
    if (pod) await showRichStep(ctx, positionRichMessage(pod))
  })
})

// Resolves the caller's live pod fresh from the chat: every handler re-fetches instead of trusting
// callback_data (like matchReport.ts's requireTable)
export async function requirePod(ctx: Context): Promise<LivePod | null> {
  const associateUuid = await requireLinkedAssociate(ctx)
  if (!associateUuid) {
    await ctx.answerCallbackQuery().catch(() => {})
    return null
  }
  const pod = await fetchLivePod(associateUuid)
  if (!pod) {
    await ctx.answerCallbackQuery({ text: 'Questo tavolo non è più aperto.', show_alert: true }).catch(() => {})
    return null
  }
  return pod
}

// /tavolo: true if the chat's associate sits at a Commander pod being played, false
// to let the caller fall back
export async function replyWithLiveCommanderPod(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id
  if (!chatId) return false

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return false

  const pod = await fetchLivePod(associateUuid)
  if (!pod) return false

  const place = pod.tableNumber === null ? `${ICONS.table} Il tuo tavolo` : `${ICONS.table} Tavolo ${pod.tableNumber}`
  const usernames = await fetchTelegramUsernames(pod.opponents.map(o => o.associateUuid))
  const opponents = pod.opponents.map(o => ({
    name: o.name,
    telegramUsername: usernames.get(o.associateUuid)
  }))
  await ctx.replyWithRichMessage({
    blocks: [
      { type: 'heading', size: 3, text: place },
      {
        type: 'paragraph',
        text: `${pod.tournamentName} · Round ${pod.roundNumber}\n\n${opponentsText(opponents)}`
      }
    ]
  }, { reply_markup: commanderPodMenu })
  return true
}

registerDeepLink('commander-pod', replyWithLiveCommanderPod)
