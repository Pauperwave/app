// server\utils\telegram\commands\tournaments\commanderResultWizard.ts
// The callbacks of the result wizard: position, kills, votes, then the summary. Same linear
// pick-then-confirm flow mockups/risultato.ts always had, but each pick writes immediately
// (saveCommanderPosition / recordKill / removeKillBetween / castVote), so confirming on the final
// screen only sends the follow-up tables and writes nothing new, and "Modifica" just walks back to
// the position step. The messages themselves are in commanderPodMessages.ts.
//
// One handler per callback, each answering only its own prefix and passing everything else on
// (like prezzo.ts and elenco.ts), so the order they are registered in doesn't matter.
import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'

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
  dropAskRichMessage, finalRichMessage, isKillTarget, isLastRound, killTargetUuid,
  killsRichMessage, parseKillTarget, positionRichMessage, resultFactsFor, scoreSummaryTableBlock,
  voteRichMessage, voteTypeOf, votesReceivedTableBlock, waitingForOthersRichMessage
} from './commanderPodMessages'

type Next = () => Promise<void>

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

// Reads the table again (a pick may just have changed it) and shows the message for it
async function showStepFor(ctx: Context, build: (pod: LivePod) => InputRichMessage) {
  const pod = await requirePod(ctx)
  if (pod) await showRichStep(ctx, build(pod))
}

// What every step shares: a chat to answer in, and one alert when anything in it fails
async function runStep(ctx: Context, name: string, step: () => Promise<void>) {
  if (!(await requireChatId(ctx))) return

  try {
    await step()
  } catch (error) {
    console.error(`Commander ${name} handler failed:`, error)
    await answerLoadError(ctx)
  }
}

// The pieces of a callback's payload after its prefix, "<prefix><pairingUuid>:<value>"
function payloadPartsOf(data: string, prefix: string): string[] {
  return data.slice(prefix.length).split(':')
}

// A kill is recorded the first time a target is picked and removed the next time
async function toggleKill(pod: LivePod, killedPlayerUuid: string) {
  const supabase = telegramServiceSupabaseClient()

  if (pod.myKilledUuids.includes(killedPlayerUuid)) {
    await removeKillBetween(supabase, {
      pairingUuid: pod.pairingUuid, killerUuid: pod.myPlayerUuid, killedPlayerUuid
    })
    return
  }

  await recordKill(supabase, {
    tournamentUuid: pod.tournamentUuid,
    pairingUuid: pod.pairingUuid,
    killerUuid: pod.myPlayerUuid,
    killedPlayerUuid
  })
}

async function handlePositionPick(ctx: Context, next: Next) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(POS_PICK_PREFIX)) return next()

  await runStep(ctx, 'position-pick', async () => {
    const payloadParts = payloadPartsOf(data, POS_PICK_PREFIX)
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
    await showStepFor(ctx, positionRichMessage)
  })
}

async function handlePositionConfirm(ctx: Context, next: Next) {
  if (!ctx.callbackQuery?.data?.startsWith(POS_CONFIRM_PREFIX)) return next()

  await runStep(ctx, 'position-confirm', () => showStepFor(ctx, killsRichMessage))
}

async function handleKillToggle(ctx: Context, next: Next) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(KILL_TOGGLE_PREFIX)) return next()

  await runStep(ctx, 'kill-toggle', async () => {
    const payloadParts = payloadPartsOf(data, KILL_TOGGLE_PREFIX)
    const target = parseKillTarget(payloadParts[1])
    const pod = await requirePod(ctx)
    if (target === null || !pod || !isKillTarget(pod, target)) return

    await toggleKill(pod, killTargetUuid(pod, target))
    await showStepFor(ctx, killsRichMessage)
  })
}

async function handleKillConfirm(ctx: Context, next: Next) {
  if (!ctx.callbackQuery?.data?.startsWith(KILL_CONFIRM_PREFIX)) return next()

  await runStep(ctx, 'kill-confirm', () => showStepFor(ctx, pod => voteRichMessage(pod, 'brew')))
}

async function handleVotePick(ctx: Context, next: Next) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(VOTE_PICK_PREFIX)) return next()

  await runStep(ctx, 'vote-pick', async () => {
    const payloadParts = payloadPartsOf(data, VOTE_PICK_PREFIX)
    const voteType = voteTypeOf(payloadParts[1])
    const rawIndex = payloadParts[2]

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
    await showStepFor(ctx, updated => voteRichMessage(updated, voteType))
  })
}

async function handleVoteConfirm(ctx: Context, next: Next) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(VOTE_CONFIRM_PREFIX)) return next()

  await runStep(ctx, 'vote-confirm', async () => {
    const payloadParts = payloadPartsOf(data, VOTE_CONFIRM_PREFIX)

    const pod = await requirePod(ctx)
    if (!pod) return
    // Brew votes come first, then play votes, then the final summary
    await showRichStep(
      ctx,
      voteTypeOf(payloadParts[1]) === 'brew' ? voteRichMessage(pod, 'play') : finalRichMessage(pod)
    )
  })
}

async function handleFinalConfirm(ctx: Context, next: Next) {
  if (!ctx.callbackQuery?.data?.startsWith(FINAL_CONFIRM_PREFIX)) return next()

  await runStep(ctx, 'final-confirm', async () => {
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
  })
}

async function handleFinalRefresh(ctx: Context, next: Next) {
  if (!ctx.callbackQuery?.data?.startsWith(FINAL_REFRESH_PREFIX)) return next()

  await runStep(ctx, 'refresh', async () => {
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
  })
}

async function handleFinalEdit(ctx: Context, next: Next) {
  if (!ctx.callbackQuery?.data?.startsWith(FINAL_EDIT_PREFIX)) return next()

  await runStep(ctx, 'final-edit', () => showStepFor(ctx, positionRichMessage))
}

export function registerCommanderResultHandlers(bot: Bot) {
  bot.on('callback_query:data', handlePositionPick)
  bot.on('callback_query:data', handlePositionConfirm)
  bot.on('callback_query:data', handleKillToggle)
  bot.on('callback_query:data', handleKillConfirm)
  bot.on('callback_query:data', handleVotePick)
  bot.on('callback_query:data', handleVoteConfirm)
  bot.on('callback_query:data', handleFinalConfirm)
  bot.on('callback_query:data', handleFinalRefresh)
  bot.on('callback_query:data', handleFinalEdit)
}
