// server\utils\telegram\commands\tournaments\commanderDrop.ts
// Leaving a Commander tournament from Telegram: the /drop command and the confirm/cancel/undo
// buttons. A drop takes effect from the next round (see ADR-048). Messages:
// commanderPodMessages.ts.
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { requireLinkedAssociate } from '../account/linking'
import { answerLoadError, requireChatId } from '../callbackErrors'
import { showRichStep } from '../mockups/richStepHelpers'
import { fetchLivePod } from './commanderPodData'
import { requirePod } from './commanderPod'
import {
  DROP_ASK_PREFIX, DROP_CANCEL_PREFIX, DROP_CONFIRM_PREFIX, DROP_UNDO_PREFIX,
  dropAlreadyDoneRichMessage, dropAskRichMessage, dropCancelledRichMessage,
  dropConfirmRichMessage, dropDoneRichMessage, isLastRound
} from './commanderPodMessages'
import { ICONS } from '~~/server/utils/telegram/icons'

// /drop: the same confirmation the post-result prompt leads to, but reachable any time — with the
// same rules (a Commander pod being played, result already entered, not the last round).
async function dropCommandHandler(ctx: Context) {
  const associateUuid = await requireLinkedAssociate(ctx)
  if (!associateUuid) return

  const pod = await fetchLivePod(associateUuid)
  if (!pod) {
    await ctx.reply(`${ICONS.table} Nessun tavolo Commander aperto per te: il drop si fa durante un torneo Commander.`)
    return
  }
  if (pod.myDropped) {
    await ctx.replyWithRichMessage(dropAlreadyDoneRichMessage(pod))
    return
  }
  if (isLastRound(pod)) {
    await ctx.reply(`${ICONS.finishFlag} Questo è l'ultimo round del torneo: non serve droppare.`)
    return
  }
  if (pod.myPosition === null) {
    await ctx.reply(`${ICONS.write} Prima inserisci il tuo risultato (/tavolo), poi potrai droppare.`)
    return
  }
  await ctx.replyWithRichMessage(dropConfirmRichMessage(pod))
}

export function registerDropCommand(commands: CommandGroup<Context>) {
  commands.command('drop', 'Lascia il torneo Commander', dropCommandHandler)
}

export function registerCommanderDropHandlers(bot: Bot) {
  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data

    if (data.startsWith(DROP_ASK_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (pod) await showRichStep(ctx, dropConfirmRichMessage(pod))
      } catch (error) {
        console.error('Commander drop-ask handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(DROP_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (!pod) return
        // Dropping comes after entering the score — never before a placement exists.
        if (pod.myPosition === null) {
          await ctx.answerCallbackQuery({ text: 'Prima inserisci il tuo risultato.', show_alert: true })
          return
        }
        await setPlayerDropped(telegramServiceSupabaseClient(), {
          tournamentUuid: pod.tournamentUuid,
          playerUuid: pod.myPlayerUuid,
          roundUuid: pod.roundUuid,
          dropped: true
        })
        await showRichStep(ctx, dropDoneRichMessage(pod))
      } catch (error) {
        console.error('Commander drop-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(DROP_CANCEL_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        await showRichStep(ctx, dropCancelledRichMessage())
      } catch (error) {
        console.error('Commander drop-cancel handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(DROP_UNDO_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (!pod) return
        await setPlayerDropped(telegramServiceSupabaseClient(), {
          tournamentUuid: pod.tournamentUuid,
          playerUuid: pod.myPlayerUuid,
          roundUuid: pod.roundUuid,
          dropped: false
        })
        await showRichStep(ctx, dropAskRichMessage(pod))
      } catch (error) {
        console.error('Commander drop-undo handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    await next()
  })
}
