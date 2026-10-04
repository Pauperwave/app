// server\utils\telegram\commands\tournaments\matchReport.ts
// 1v1 result entry: a player reports their table's score and it is written at once, like an
// organizer's entry. The opponent still gets a confirm/dispute prompt, but only informational:
// confirming timestamps the result, disputing flags it for the organizer without reverting it. Who
// is who always comes from the chat, never the payload.
import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'

import {
  gamesFromOutcome, MATCH_OUTCOMES, reportBlockReason, respondBlockReason, scoreLabelFor,
  type ReportBlock, type RespondBlock
} from '#shared/utils/tournaments/matchReport'

import { answerLoadError, requireChatId } from '../callbackErrors'
import { requireLinkedAssociate, resolveAssociateUuidByChatId, resolveChatIdByAssociateUuid } from '../account/linking'
import { showRichStep, twoColumnFactsTable } from '../mockups/richStepHelpers'
import { fetchLiveTable, type LiveTable } from './matchReportData'
import { confirmedNoticeText, disputedNoticeText, reportedNoticeText } from './matchNotices'
import {
  OPEN_RESULT_PREFIX, matchTableHeader, openResultButton, timerButton
} from './matchTableMessage'
import { ICONS } from '~~/server/utils/telegram/icons'

const SUMMARY_PREFIX = 'mrsum:'
const SEND_PREFIX = 'mrsend:'
const CONFIRM_PREFIX = 'mrok:'
const DISPUTE_PREFIX = 'mrno:'

const BLOCK_MESSAGES: Record<ReportBlock | RespondBlock, string> = {
  'not-a-player': 'Questo match non è tuo.',
  'match-completed': 'Il risultato di questo match è già stato registrato.',
  'no-report': 'Non c\'è nessun risultato da confermare.',
  'own-report': 'Il risultato lo deve confermare il tuo avversario.',
  'already-confirmed': 'Hai già confermato questo risultato.',
  'already-disputed': 'Hai già contestato questo risultato: decide l\'organizzatore.'
}

function outcomeAt(index: number) {
  const outcome = MATCH_OUTCOMES[index]
  if (!outcome) throw new Error(`Invalid match outcome index: ${index}`)
  return outcome
}

// SUMMARY_PREFIX/SEND_PREFIX buttons always encode a real index; null only reaches here on a
// malformed payload
function requireOutcomeIndex(index: number | null): number {
  if (index === null) throw new Error('Missing match outcome index')
  outcomeAt(index)
  return index
}

function answerButtons(pairingUuid: string) {
  return {
    type: 'buttons' as const,
    buttons: [
      { text: `${ICONS.success} Confermo`, style: 'success' as const, callback_data: `${CONFIRM_PREFIX}${pairingUuid}` },
      { text: `${ICONS.failure} Non è corretto`, style: 'danger' as const, callback_data: `${DISPUTE_PREFIX}${pairingUuid}` }
    ]
  }
}

// The score as the viewer sees it, from the result stored as player1/player2
function resultScoreLabel(table: LiveTable): string {
  if (!table.result) return ''
  return scoreLabelFor(table.result, table.isPlayer1)
}

// What /tavolo shows for a 1v1: where they sit, against whom, and what the result says. The table
// card is the one the tables announcement pushes (matchTableMessage.ts); the timer button is on
// every state, since the table only exists while its round is being played.
function tableRichMessage(
  table: LiveTable,
  opponentUsername: string | undefined,
  siteUrl: string
): InputRichMessage {
  const blocks: NonNullable<InputRichMessage['blocks']> = matchTableHeader({
    tableNumber: table.tableNumber,
    tournamentName: table.tournamentName,
    roundNumber: table.roundNumber,
    opponent: { name: table.opponent.name, telegramUsername: opponentUsername }
  })
  const timer = timerButton(siteUrl)

  if (!table.result) {
    blocks.push(table.pairingStatus === 'completed'
      ? { type: 'paragraph', text: `${ICONS.success} Risultato registrato.` }
      : { type: 'buttons', buttons: [openResultButton(table.pairingUuid), timer] })
  } else if (table.result.disputedAt) {
    blocks.push({ type: 'paragraph', text: `${ICONS.warning} Risultato contestato (${resultScoreLabel(table)}): decide l'organizzatore.` })
  } else if (table.result.confirmedAt) {
    blocks.push({ type: 'paragraph', text: `${ICONS.success} Risultato confermato: ${resultScoreLabel(table)}.` })
  } else if (table.result.reporterUuid === table.myPlayerUuid) {
    blocks.push({
      type: 'paragraph',
      text: `${ICONS.success} Hai inserito ${resultScoreLabel(table)}. In attesa che ${table.opponent.name} lo confermi.`
    })
  } else {
    blocks.push(
      { type: 'paragraph', text: `${table.opponent.name} ha inserito ${resultScoreLabel(table)} (i tuoi game per primi). È corretto?` },
      answerButtons(table.pairingUuid)
    )
  }

  // The first state above already carries the timer next to its button
  if (table.result || table.pairingStatus === 'completed') {
    blocks.push({ type: 'buttons', buttons: [timer] })
  }
  return { blocks }
}

// currentIndex is the outcome already picked when reopened via "✏️ Modifica" (null the first time),
// highlighted ⭐/success like mockups/risultato.ts's pickRichMessage
function outcomePickRichMessage(table: LiveTable, currentIndex: number | null): InputRichMessage {
  return {
    blocks: [
      { type: 'paragraph', text: `${ICONS.dice} Risultato del match contro ${table.opponent.name}\n\nQuanti game hai vinto tu e quanti lui?` },
      {
        type: 'buttons',
        buttons: MATCH_OUTCOMES.map((outcome, index) => {
          const isSelected = index === currentIndex
          return {
            text: `${isSelected ? `${ICONS.selected} ` : ''}${outcome.label}`,
            style: isSelected ? 'success' as const : undefined,
            callback_data: `${SUMMARY_PREFIX}${table.pairingUuid}:${index}`
          }
        })
      }
    ]
  }
}

function summaryRichMessage(table: LiveTable, outcomeIndex: number): InputRichMessage {
  const outcome = outcomeAt(outcomeIndex)
  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.receipt} Riepilogo risultato` },
      twoColumnFactsTable('Da inviare', [
        [`${ICONS.versus} Avversario`, table.opponent.name],
        [`${ICONS.dice} Risultato`, outcome.label]
      ]),
      { type: 'paragraph', text: `Il risultato verrà registrato subito, ${table.opponent.name} riceverà solo una richiesta di conferma. Lo invio?` },
      {
        type: 'buttons',
        buttons: [
          { text: `${ICONS.success} Invia`, style: 'success', callback_data: `${SEND_PREFIX}${table.pairingUuid}:${outcomeIndex}` },
          { text: `${ICONS.edit} Modifica`, style: 'danger', callback_data: `${OPEN_RESULT_PREFIX}${table.pairingUuid}:${outcomeIndex}` }
        ]
      }
    ]
  }
}

// /tavolo: true if the chat's associate sits at a 1v1 table
// being played (and it was answered), false to let the caller fall back
export async function replyWithLiveTable(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id
  if (!chatId) return false

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return false

  const table = await fetchLiveTable(associateUuid)
  if (!table) return false

  const usernames = await fetchTelegramUsernames([table.opponent.associateUuid])
  await ctx.replyWithRichMessage(tableRichMessage(
    table,
    usernames.get(table.opponent.associateUuid),
    useRuntimeConfig().public.siteUrl
  ))
  return true
}

// The associate's table for this button, or null after telling them why not
async function requireTable(ctx: Context, pairingUuid: string): Promise<LiveTable | null> {
  const associateUuid = await requireLinkedAssociate(ctx)
  if (!associateUuid) {
    await ctx.answerCallbackQuery().catch(() => {})
    return null
  }

  const table = await fetchLiveTable(associateUuid, pairingUuid)
  if (!table) {
    await ctx.answerCallbackQuery({ text: 'Questo match non è più aperto.', show_alert: true }).catch(() => {})
    return null
  }
  return table
}

async function alertBlock(ctx: Context, block: ReportBlock | RespondBlock) {
  await ctx.answerCallbackQuery({ text: BLOCK_MESSAGES[block], show_alert: true }).catch(() => {})
}

// requireTable + a reportBlockReason check (alerting and returning null if blocked), shared by
// handleOpen/handleSummary/handleSend
async function requireReportableTable(
  ctx: Context, pairingUuid: string
): Promise<LiveTable | null> {
  const table = await requireTable(ctx, pairingUuid)
  if (!table) return null

  const block = reportBlockReason({ pairingStatus: table.pairingStatus, isParticipant: true })
  if (block) {
    await alertBlock(ctx, block)
    return null
  }
  return table
}

// Same as requireReportableTable, for the opponent's confirm/dispute side
// (handleConfirm/handleDispute)
async function requireRespondableTable(
  ctx: Context, pairingUuid: string
): Promise<LiveTable | null> {
  const table = await requireTable(ctx, pairingUuid)
  if (!table) return null

  const block = respondBlockReason({
    isParticipant: true,
    responderUuid: table.myPlayerUuid,
    result: table.result
  })
  if (block) {
    await alertBlock(ctx, block)
    return null
  }
  return table
}

// Best-effort: the result is already saved, a failed message must not undo it
async function notifyOpponent(ctx: Context, table: LiveTable, message: InputRichMessage) {
  try {
    const chatId = await resolveChatIdByAssociateUuid(table.opponent.associateUuid)
    if (chatId) await ctx.api.sendRichMessage(chatId, message)
  } catch (error) {
    console.error('Failed to notify the opponent about a match report:', error)
  }
}

async function handleOpen(ctx: Context, pairingUuid: string, currentIndex: number | null) {
  const table = await requireReportableTable(ctx, pairingUuid)
  if (!table) return

  await showRichStep(ctx, outcomePickRichMessage(table, currentIndex))
}

async function handleSummary(ctx: Context, pairingUuid: string, outcomeIndex: number | null) {
  const table = await requireReportableTable(ctx, pairingUuid)
  if (!table) return

  await showRichStep(ctx, summaryRichMessage(table, requireOutcomeIndex(outcomeIndex)))
}

async function handleSend(ctx: Context, pairingUuid: string, outcomeIndex: number | null) {
  const table = await requireReportableTable(ctx, pairingUuid)
  if (!table) return

  const outcome = outcomeAt(requireOutcomeIndex(outcomeIndex))
  const games = gamesFromOutcome(outcome, table.isPlayer1)

  await saveMatchResult(telegramServiceSupabaseClient(), {
    tournamentUuid: table.tournamentUuid,
    pairingUuid: table.pairingUuid,
    player1Uuid: table.player1Uuid,
    player2Uuid: table.player2Uuid,
    player1GamesWon: games.player1GamesWon,
    player2GamesWon: games.player2GamesWon,
    reportedByPlayerUuid: table.myPlayerUuid
  })

  const opponentChatId = await resolveChatIdByAssociateUuid(table.opponent.associateUuid)
  const followUp = opponentChatId
    ? `Ho avvisato ${table.opponent.name}: se contesta, decide l'organizzatore.`
    : `${table.opponent.name} non ha collegato Telegram: se il risultato è sbagliato dovrà correggerlo l'organizzatore.`

  await showRichStep(ctx, {
    blocks: [{ type: 'paragraph', text: `${ICONS.success} Risultato registrato: ${outcome.label}\n\n${followUp}` }]
  })

  // From the opponent's side: their own games first
  const opponentGames = scoreLabelFor(games, !table.isPlayer1)
  await notifyOpponent(ctx, table, {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.receipt} Risultato inserito` },
      {
        type: 'paragraph',
        text: reportedNoticeText(table.myName, table.roundNumber, opponentGames)
      },
      answerButtons(table.pairingUuid)
    ]
  })
}

async function handleConfirm(ctx: Context, pairingUuid: string) {
  const table = await requireRespondableTable(ctx, pairingUuid)
  // respondBlockReason already returns 'no-report' when table.result is null: this only narrows for
  // TS
  if (!table?.result) return

  await confirmMatchResult(telegramServiceSupabaseClient(), table.pairingUuid)

  const score = resultScoreLabel(table)
  await showRichStep(ctx, { blocks: [{ type: 'paragraph', text: `${ICONS.success} Risultato confermato: ${score}` }] })
  await notifyOpponent(ctx, table, {
    blocks: [{
      type: 'paragraph',
      text: confirmedNoticeText(
        table.myName,
        table.roundNumber,
        scoreLabelFor(table.result, !table.isPlayer1)
      )
    }]
  })
}

async function handleDispute(ctx: Context, pairingUuid: string) {
  const table = await requireRespondableTable(ctx, pairingUuid)
  if (!table) return

  await disputeMatchResult(telegramServiceSupabaseClient(), table.pairingUuid)
  await showRichStep(ctx, {
    blocks: [{ type: 'paragraph', text: `${ICONS.warning} Risultato contestato: l'organizzatore lo verificherà.` }]
  })
  await notifyOpponent(ctx, table, {
    blocks: [{
      type: 'paragraph',
      text: disputedNoticeText(table.myName, table.roundNumber)
    }]
  })
}

// "<pairing uuid>[:<outcome index>]" after a prefix; the index is absent for OPEN_RESULT_PREFIX (no prior
// pick) and CONFIRM_PREFIX/DISPUTE_PREFIX
function parsePayload(payload: string): { pairingUuid: string, outcomeIndex: number | null } {
  const [pairingUuid, outcome] = payload.split(':')
  if (!pairingUuid) throw new Error(`Malformed match report payload: "${payload}"`)
  if (outcome === undefined) return { pairingUuid, outcomeIndex: null }

  const outcomeIndex = Number(outcome)
  const isValidIndex = Number.isInteger(outcomeIndex)
    && outcomeIndex >= 0
    && outcomeIndex < MATCH_OUTCOMES.length
  if (!isValidIndex) {
    throw new Error(`Malformed match report payload: "${payload}"`)
  }
  return { pairingUuid, outcomeIndex }
}

export function registerMatchReportHandlers(bot: Bot) {
  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data

    type Run = (uuid: string, outcomeIndex: number | null) => Promise<unknown>
    const routes: [prefix: string, run: Run][] = [
      [OPEN_RESULT_PREFIX, (uuid, outcomeIndex) => handleOpen(ctx, uuid, outcomeIndex)],
      [SUMMARY_PREFIX, (uuid, outcomeIndex) => handleSummary(ctx, uuid, outcomeIndex)],
      [SEND_PREFIX, (uuid, outcomeIndex) => handleSend(ctx, uuid, outcomeIndex)],
      [CONFIRM_PREFIX, pairingUuid => handleConfirm(ctx, pairingUuid)],
      [DISPUTE_PREFIX, pairingUuid => handleDispute(ctx, pairingUuid)]
    ]

    const route = routes.find(([prefix]) => data.startsWith(prefix))
    if (!route) return next()
    if (!(await requireChatId(ctx))) return

    try {
      const [prefix, run] = route
      const { pairingUuid, outcomeIndex } = parsePayload(data.slice(prefix.length))
      await run(pairingUuid, outcomeIndex)
    } catch (error) {
      console.error('Match report handler failed:', error)
      await answerLoadError(ctx)
    }
  })
}
