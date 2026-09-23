// server\utils\telegram\commands\tournaments\matchReport.ts
// 1v1 result entry: a player reports the score of their table, the opponent
// confirms it (or says it's wrong), and only a confirmed report becomes the
// real result. Unanswered or disputed reports wait for an organizer.
// Who is who always comes from the chat, never from the button's payload.
import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'

import {
  gamesFromOutcome, MATCH_OUTCOMES, reportBlockReason, respondBlockReason, scoreLabelFor,
  type ReportBlock, type RespondBlock
} from '#shared/utils/tournaments/matchReport'

import { answerLoadError, requireChatId } from '../callbackErrors'
import { requireLinkedAssociate, resolveAssociateUuidByChatId, resolveChatIdByAssociateUuid } from '../account/linking'
import { showRichStep, twoColumnFactsTable } from '../mockups/richStepHelpers'
import { createMatchReport, disputeMatchReport, fetchLiveTable, type LiveTable } from './matchReportData'

const OPEN_PREFIX = 'mropen:'
const SUMMARY_PREFIX = 'mrsum:'
const SEND_PREFIX = 'mrsend:'
const CONFIRM_PREFIX = 'mrok:'
const DISPUTE_PREFIX = 'mrno:'

const BLOCK_MESSAGES: Record<ReportBlock | RespondBlock, string> = {
  'not-a-player': 'Questo match non è tuo.',
  'match-completed': 'Il risultato di questo match è già stato registrato.',
  'already-reported': 'Per questo match è già stato inserito un risultato.',
  'no-report': 'Non c\'è nessun risultato da confermare.',
  'own-report': 'Il risultato lo deve confermare il tuo avversario.',
  'already-disputed': 'Questo risultato è già stato contestato: decide l\'organizzatore.'
}

function outcomeAt(index: number) {
  const outcome = MATCH_OUTCOMES[index]
  if (!outcome) throw new Error(`Invalid match outcome index: ${index}`)
  return outcome
}

function answerButtons(pairingUuid: string) {
  return {
    type: 'buttons' as const,
    buttons: [
      { text: '✅ Confermo', style: 'success' as const, callback_data: `${CONFIRM_PREFIX}${pairingUuid}` },
      { text: '❌ Non è corretto', style: 'danger' as const, callback_data: `${DISPUTE_PREFIX}${pairingUuid}` }
    ]
  }
}

// The score as the viewer sees it, from the report stored as player1/player2
function reportScoreLabel(table: LiveTable): string {
  if (!table.report) return ''
  return scoreLabelFor(table.report, table.isPlayer1)
}

// What /tavolo and /risultato show: where they sit and what the result says
function tableRichMessage(table: LiveTable): InputRichMessage {
  const place = table.tableNumber === null ? '🪑 Il tuo tavolo' : `🪑 Tavolo ${table.tableNumber}`
  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: place },
    { type: 'paragraph', text: `${table.tournamentName} · Round ${table.roundNumber}\n\nGiochi contro: ${table.opponent.name}` }
  ]

  if (table.pairingStatus === 'completed') {
    blocks.push({ type: 'paragraph', text: '✅ Risultato registrato.' })
  } else if (!table.report) {
    blocks.push({
      type: 'buttons',
      buttons: [{ text: '✍️ Inserisci risultato', style: 'primary', callback_data: `${OPEN_PREFIX}${table.pairingUuid}` }]
    })
  } else if (table.report.status === 'disputed') {
    blocks.push({ type: 'paragraph', text: '⚠️ Il risultato è stato contestato: decide l\'organizzatore.' })
  } else if (table.report.reporterUuid === table.myPlayerUuid) {
    blocks.push({
      type: 'paragraph',
      text: `⏳ Hai inserito ${reportScoreLabel(table)}: aspetto la conferma di ${table.opponent.name}, altrimenti decide l'organizzatore.`
    })
  } else {
    blocks.push(
      { type: 'paragraph', text: `⏳ ${table.opponent.name} ha inserito ${reportScoreLabel(table)} (i tuoi game per primi). È corretto?` },
      answerButtons(table.pairingUuid)
    )
  }
  return { blocks }
}

function outcomePickRichMessage(table: LiveTable): InputRichMessage {
  return {
    blocks: [
      { type: 'paragraph', text: `🎲 Risultato del match contro ${table.opponent.name}\n\nQuanti game hai vinto tu e quanti lui?` },
      {
        type: 'buttons',
        buttons: MATCH_OUTCOMES.map((outcome, index) => ({
          text: outcome.label,
          callback_data: `${SUMMARY_PREFIX}${table.pairingUuid}:${index}`
        }))
      }
    ]
  }
}

function summaryRichMessage(table: LiveTable, outcomeIndex: number): InputRichMessage {
  const outcome = outcomeAt(outcomeIndex)
  return {
    blocks: [
      { type: 'heading', size: 3, text: '🧾 Riepilogo risultato' },
      twoColumnFactsTable('Da inviare', [
        ['🆚 Avversario', table.opponent.name],
        ['🎲 Risultato', outcome.label]
      ]),
      { type: 'paragraph', text: `${table.opponent.name} dovrà confermarlo. Lo invio?` },
      {
        type: 'buttons',
        buttons: [
          { text: '✅ Invia', style: 'success', callback_data: `${SEND_PREFIX}${table.pairingUuid}:${outcomeIndex}` },
          { text: '✏️ Modifica', style: 'danger', callback_data: `${OPEN_PREFIX}${table.pairingUuid}` }
        ]
      }
    ]
  }
}

// /tavolo and /risultato: true if the chat's associate sits at a 1v1 table
// being played (and it was answered), false to let the caller fall back
export async function replyWithLiveTable(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id
  if (!chatId) return false

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return false

  const table = await fetchLiveTable(associateUuid)
  if (!table) return false

  await ctx.replyWithRichMessage(tableRichMessage(table))
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

// requireTable + a reportBlockReason check, alerting and returning null if
// blocked — shared by handleOpen/handleSummary/handleSend, which
// independently duplicated this exact pair of calls.
async function requireReportableTable(
  ctx: Context, pairingUuid: string
): Promise<LiveTable | null> {
  const table = await requireTable(ctx, pairingUuid)
  if (!table) return null

  const block = reportBlockReason({
    pairingStatus: table.pairingStatus,
    isParticipant: true,
    report: table.report
  })
  if (block) {
    await alertBlock(ctx, block)
    return null
  }
  return table
}

// Same as requireReportableTable, for the opponent's confirm/dispute side —
// shared by handleConfirm/handleDispute.
async function requireRespondableTable(
  ctx: Context, pairingUuid: string
): Promise<LiveTable | null> {
  const table = await requireTable(ctx, pairingUuid)
  if (!table) return null

  const block = respondBlockReason({
    pairingStatus: table.pairingStatus,
    isParticipant: true,
    responderUuid: table.myPlayerUuid,
    report: table.report
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

async function handleOpen(ctx: Context, pairingUuid: string) {
  const table = await requireReportableTable(ctx, pairingUuid)
  if (!table) return

  await showRichStep(ctx, outcomePickRichMessage(table))
}

async function handleSummary(ctx: Context, pairingUuid: string, outcomeIndex: number) {
  const table = await requireReportableTable(ctx, pairingUuid)
  if (!table) return

  await showRichStep(ctx, summaryRichMessage(table, outcomeIndex))
}

async function handleSend(ctx: Context, pairingUuid: string, outcomeIndex: number) {
  const table = await requireReportableTable(ctx, pairingUuid)
  if (!table) return

  const outcome = outcomeAt(outcomeIndex)
  const games = gamesFromOutcome(outcome, table.isPlayer1)
  const created = await createMatchReport(table, games)
  if (!created) return alertBlock(ctx, 'already-reported')

  const opponentChatId = await resolveChatIdByAssociateUuid(table.opponent.associateUuid)
  const followUp = opponentChatId
    ? `Ho chiesto conferma a ${table.opponent.name}: se non risponde decide l'organizzatore.`
    : `${table.opponent.name} non ha collegato Telegram: il risultato resta in attesa dell'organizzatore.`

  await showRichStep(ctx, {
    blocks: [{ type: 'paragraph', text: `✅ Risultato inviato: ${outcome.label}\n\n${followUp}` }]
  })

  // From the opponent's side: their own games first
  const opponentGames = scoreLabelFor(games, !table.isPlayer1)
  await notifyOpponent(ctx, table, {
    blocks: [
      { type: 'heading', size: 3, text: '🧾 Conferma risultato' },
      {
        type: 'paragraph',
        text: `Per il match del Round ${table.roundNumber} ${table.opponent.name} ha inserito ${opponentGames} (i tuoi game per primi). È corretto?`
      },
      answerButtons(table.pairingUuid)
    ]
  })
}

async function handleConfirm(ctx: Context, pairingUuid: string) {
  const table = await requireRespondableTable(ctx, pairingUuid)
  // respondBlockReason already returns 'no-report' when table.report is
  // null, so this is narrowing for TS, not a reachable extra guard.
  if (!table?.report) return

  await saveMatchResult(telegramServiceSupabaseClient(), {
    tournamentUuid: table.tournamentUuid,
    pairingUuid: table.pairingUuid,
    player1Uuid: table.player1Uuid,
    player2Uuid: table.player2Uuid,
    player1GamesWon: table.report.player1GamesWon,
    player2GamesWon: table.report.player2GamesWon
  })

  const score = reportScoreLabel(table)
  await showRichStep(ctx, { blocks: [{ type: 'paragraph', text: `✅ Risultato confermato: ${score}` }] })
  await notifyOpponent(ctx, table, {
    blocks: [{
      type: 'paragraph',
      text: `✅ ${table.opponent.name} ha confermato il risultato del Round ${table.roundNumber}: ${scoreLabelFor(table.report, !table.isPlayer1)}`
    }]
  })
}

async function handleDispute(ctx: Context, pairingUuid: string) {
  const table = await requireRespondableTable(ctx, pairingUuid)
  if (!table) return

  await disputeMatchReport(table.pairingUuid)
  await showRichStep(ctx, {
    blocks: [{ type: 'paragraph', text: '⚠️ Risultato contestato: l\'organizzatore deciderà.' }]
  })
  await notifyOpponent(ctx, table, {
    blocks: [{
      type: 'paragraph',
      text: `⚠️ ${table.opponent.name} ha contestato il risultato del Round ${table.roundNumber}: l'organizzatore deciderà.`
    }]
  })
}

// "<pairing uuid>[:<outcome index>]" after a prefix
function parsePayload(payload: string): { pairingUuid: string, outcomeIndex: number } {
  const [pairingUuid, outcome] = payload.split(':')
  if (!pairingUuid) throw new Error(`Malformed match report payload: "${payload}"`)
  const outcomeIndex = Number(outcome ?? 0)
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

    type Run = (uuid: string, outcomeIndex: number) => Promise<unknown>
    const routes: [prefix: string, run: Run][] = [
      [OPEN_PREFIX, pairingUuid => handleOpen(ctx, pairingUuid)],
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
