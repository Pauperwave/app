// server\utils\telegram\commands\tournaments\commanderResultWizard.ts
// The callbacks of the result wizard: position, kills, votes, then the summary. Same linear
// pick-then-confirm flow mockups/risultato.ts always had, but each pick writes immediately
// (saveCommanderPosition / recordKill / removeKillBetween / castVote), so confirming on the final
// screen only sends the follow-up tables and writes nothing new, and "Modifica" just walks back to
// the position step. The messages themselves are in commanderPodMessages.ts.
import type { Bot, Context } from 'grammy'

import { answerLoadError, requireChatId } from '../callbackErrors'
import { editRichMessage, showRichStep, twoColumnFactsTable } from '../mockups/richStepHelpers'
import {
  fetchPendingSeatNames, fetchPodScoreSummary, fetchVotesReceivedFor, type LivePod
} from './commanderPodData'
import { requirePod } from './commanderPod'
import {
  FINAL_CONFIRM_PREFIX, FINAL_EDIT_PREFIX, FINAL_REFRESH_PREFIX, KILL_CONFIRM_PREFIX,
  KILL_TOGGLE_PREFIX,
  POSITIONS, POS_CONFIRM_PREFIX, POS_PICK_PREFIX, VOTE_CONFIRM_PREFIX, VOTE_PICK_PREFIX,
  dropAskRichMessage, finalRichMessage, isLastRound, killTargetUuid, killsRichMessage,
  positionRichMessage, resultFactsFor, scoreSummaryTableBlock, voteRichMessage,
  votesReceivedTableBlock, waitingForOthersRichMessage, type KillTarget
} from './commanderPodMessages'

// Both tables read every seat's picks, so they are only sent once the whole table has finished
async function sendFollowUpTables(ctx: Context, pod: LivePod) {
  const [votesReceived, score] = await Promise.all([
    fetchVotesReceivedFor(pod), fetchPodScoreSummary(pod)
  ])
  await Promise.all([
    ctx.replyWithRichMessage({ blocks: [votesReceivedTableBlock(votesReceived, score)] }),
    ctx.replyWithRichMessage({ blocks: [scoreSummaryTableBlock(score)] })
  ])
}

export function registerCommanderResultHandlers(bot: Bot) {
  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data

    if (data.startsWith(POS_PICK_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const payloadParts = data.slice(POS_PICK_PREFIX.length).split(':')
        const rawPosition = payloadParts[1]
        const position = Number(rawPosition)
        if (!POSITIONS.includes(position)) return
        const pod = await requirePod(ctx)
        if (!pod) return
        await saveCommanderPosition(telegramServiceSupabaseClient(), {
          tournamentUuid: pod.tournamentUuid,
          pairingUuid: pod.pairingUuid,
          playerUuid: pod.myPlayerUuid,
          position
        })
        const updated = await requirePod(ctx)
        if (updated) await showRichStep(ctx, positionRichMessage(updated))
      } catch (error) {
        console.error('Commander position-pick handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(POS_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (pod) await showRichStep(ctx, killsRichMessage(pod))
      } catch (error) {
        console.error('Commander position-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(KILL_TOGGLE_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const payloadParts = data.slice(KILL_TOGGLE_PREFIX.length).split(':')
        const rawTarget = payloadParts[1]
        const target: KillTarget = rawTarget === 'me' ? 'me' : Number(rawTarget)
        if (target !== 'me' && (!Number.isInteger(target) || target < 0)) return
        const pod = await requirePod(ctx)
        if (!pod) return
        if (target !== 'me' && !pod.opponents[target]) return

        const killedPlayerUuid = killTargetUuid(pod, target)
        const supabase = telegramServiceSupabaseClient()
        if (pod.myKilledUuids.includes(killedPlayerUuid)) {
          await removeKillBetween(supabase, {
            pairingUuid: pod.pairingUuid, killerUuid: pod.myPlayerUuid, killedPlayerUuid
          })
        } else {
          await recordKill(supabase, {
            tournamentUuid: pod.tournamentUuid,
            pairingUuid: pod.pairingUuid,
            killerUuid: pod.myPlayerUuid,
            killedPlayerUuid
          })
        }
        const updated = await requirePod(ctx)
        if (updated) await showRichStep(ctx, killsRichMessage(updated))
      } catch (error) {
        console.error('Commander kill-toggle handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(KILL_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (pod) await showRichStep(ctx, voteRichMessage(pod, 'brew'))
      } catch (error) {
        console.error('Commander kill-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(VOTE_PICK_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const payloadParts = data.slice(VOTE_PICK_PREFIX.length).split(':')
        const typeChar = payloadParts[1]
        const rawIndex = payloadParts[2]
        const voteType = typeChar === 'b' ? 'brew' as const : 'play' as const
        const pod = await requirePod(ctx)
        if (!pod) return
        const opponent = pod.opponents[Number(rawIndex)]
        if (!opponent) return

        await castVote(telegramServiceSupabaseClient(), {
          tournamentUuid: pod.tournamentUuid,
          pairingUuid: pod.pairingUuid,
          voterUuid: pod.myPlayerUuid,
          votedPlayerUuid: opponent.playerUuid,
          voteType
        })
        const updated = await requirePod(ctx)
        if (updated) await showRichStep(ctx, voteRichMessage(updated, voteType))
      } catch (error) {
        console.error('Commander vote-pick handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(VOTE_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const payloadParts = data.slice(VOTE_CONFIRM_PREFIX.length).split(':')
        const typeChar = payloadParts[1]
        const pod = await requirePod(ctx)
        if (!pod) return
        if (typeChar === 'b') {
          await showRichStep(ctx, voteRichMessage(pod, 'play'))
        } else {
          await showRichStep(ctx, finalRichMessage(pod))
        }
      } catch (error) {
        console.error('Commander vote-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(FINAL_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (!pod) return
        // Nothing left to write: every pick was saved as it happened. Edit down to the plain
        // summary, then send votes-received and score as their own messages (full width each),
        // or say who is still missing
        const pending = await fetchPendingSeatNames(pod)
        await Promise.all([
          editRichMessage(ctx, {
            blocks: [twoColumnFactsTable('Risultato inviato', resultFactsFor(pod))]
          }),
          ctx.answerCallbackQuery()
        ])
        if (pending.length) {
          await ctx.replyWithRichMessage(waitingForOthersRichMessage(pod, pending))
        } else {
          await sendFollowUpTables(ctx, pod)
        }
        if (!isLastRound(pod)) await ctx.replyWithRichMessage(dropAskRichMessage(pod))
      } catch (error) {
        console.error('Commander final-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(FINAL_REFRESH_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (!pod) return
        const pending = await fetchPendingSeatNames(pod)
        if (pending.length) {
          await ctx.answerCallbackQuery({ text: `⏳ Mancano ancora: ${pending.join(', ')}` })
          return
        }
        await Promise.all([
          editRichMessage(ctx, { blocks: [{ type: 'paragraph', text: '✅ Tutti hanno finito.' }] }),
          ctx.answerCallbackQuery()
        ])
        await sendFollowUpTables(ctx, pod)
      } catch (error) {
        console.error('Commander refresh handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(FINAL_EDIT_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (pod) await showRichStep(ctx, positionRichMessage(pod))
      } catch (error) {
        console.error('Commander final-edit handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    await next()
  })
}
