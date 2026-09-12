// server\utils\telegram\commands\mockups\risultato1v1.ts

// MOCKUP — no live-write flow yet (docs/architecture/telegram-bot.md).
// 1v1 twin of risultato.ts's own Commander flow: no position/kills/votes
// (those are pod-politics concepts specific to multiplayer Commander), a
// single "match outcome" step instead — win/loss/draw is fully implied by
// the game score, so one pick covers what the user asked to capture.
import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'

import { answerLoadError } from '../callbackErrors'
import { registerDeepLink } from '../../deepLinks'
import { showRichStep, twoColumnFactsTable } from './richStepHelpers'

interface MatchOutcome {
  label: string
  gamesWon: number
  gamesLost: number
  // Standard Swiss match points (3/1/0) — no real point system exists yet
  // for 1v1 formats either (same gap risultato.ts's own Commander scoring
  // flags), but these three values are the actual DCI/WER standard, not a
  // placeholder guess.
  points: number
}

const MATCH_OUTCOMES: MatchOutcome[] = [
  { label: '2-0', gamesWon: 2, gamesLost: 0, points: 3 },
  { label: '2-1', gamesWon: 2, gamesLost: 1, points: 3 },
  { label: '1-1', gamesWon: 1, gamesLost: 1, points: 1 },
  { label: '1-2', gamesWon: 1, gamesLost: 2, points: 0 },
  { label: '0-2', gamesWon: 0, gamesLost: 2, points: 0 }
]

// decodeResult1v1State already validates any decoded index is in range —
// this throws instead of indexing straight into a possibly-undefined slot
// (noUncheckedIndexedAccess) so a genuinely out-of-range call fails loudly
// rather than needing a non-null assertion to satisfy the type.
function outcomeAt(index: number): MatchOutcome {
  const outcome = MATCH_OUTCOMES[index]
  if (!outcome) throw new Error(`Invalid match outcome index: ${index}`)
  return outcome
}

const NONE = '-'

interface Result1v1State {
  outcomeIndex: number | null
  confirmed: boolean
}

const INITIAL_STATE: Result1v1State = { outcomeIndex: null, confirmed: false }

function encodeResult1v1State(state: Result1v1State): string {
  return [state.outcomeIndex ?? NONE, state.confirmed ? 1 : 0].join(':')
}

// See risultato.ts's own decodeResultState for why this validates instead
// of letting a malformed payload silently decode into a wrong-but-valid
// state (2026-09-12 code review finding, same class of bug here).
function decodeResult1v1State(raw: string): Result1v1State {
  const parts = raw.split(':')
  if (parts.length !== 2) throw new Error(`Malformed 1v1 result state payload: "${raw}"`)

  const [outcomeIndex, confirmed] = parts
  let index: number | null = null
  if (outcomeIndex !== NONE) {
    index = Number(outcomeIndex)
    if (Number.isNaN(index) || index < 0 || index >= MATCH_OUTCOMES.length) {
      throw new Error(`Malformed 1v1 result state payload: "${raw}"`)
    }
  }

  return { outcomeIndex: index, confirmed: confirmed === '1' }
}

const OUTCOME_PICK_PREFIX = 'r1vpick:'
const OUTCOME_CONFIRM_PREFIX = 'r1vconfirm:'
const FINAL_CONFIRM_PREFIX = 'r1vfconfirm:'
const FINAL_EDIT_PREFIX = 'r1vedit:'

// One row per option — same "short label, tap to pick" shape as
// risultato.ts's own pickRichMessage, reimplemented locally rather than
// shared since the two states (ResultState vs Result1v1State) aren't the
// same type and there's only one call site here anyway.
function outcomeRichMessage(state: Result1v1State): InputRichMessage {
  const buttons = MATCH_OUTCOMES.map((outcome, index) => {
    const isSelected = state.outcomeIndex === index
    return {
      // ⭐ not ✅ — that already means "completed"/"registered" elsewhere
      // (tournaments/line.ts), same reasoning as risultato.ts's own picks.
      text: `${isSelected ? '⭐ ' : ''}${outcome.label}`,
      style: isSelected ? 'success' as const : undefined,
      callback_data: `${OUTCOME_PICK_PREFIX}${encodeResult1v1State({ ...state, outcomeIndex: index })}`
    }
  })

  const blocks: InputRichMessage['blocks'] = [
    { type: 'paragraph', text: '🎲 Risultato del match\n\nCome è andato il tuo match (in game)?' },
    { type: 'buttons', buttons }
  ]
  if (state.outcomeIndex !== null) {
    blocks.push({
      type: 'buttons',
      buttons: [{
        text: '➡️ Conferma',
        style: 'primary',
        callback_data: `${OUTCOME_CONFIRM_PREFIX}${encodeResult1v1State({ ...state, confirmed: true })}`
      }]
    })
  }
  return { blocks }
}

function summaryTableBlock(outcome: MatchOutcome, caption: string) {
  return twoColumnFactsTable(caption, [
    ['🎲 Risultato', `${outcome.gamesWon}-${outcome.gamesLost}`],
    ['🏆 Punti', `${outcome.points} pt`]
  ])
}

function finalRichMessage(state: Result1v1State): InputRichMessage {
  const outcome = outcomeAt(state.outcomeIndex ?? 0)
  return {
    blocks: [
      { type: 'heading', size: 3, text: '🧾 Riepilogo risultato' },
      summaryTableBlock(outcome, 'Risultato inviato'),
      { type: 'paragraph', text: 'Confermi?' },
      {
        type: 'buttons',
        buttons: [
          {
            text: '✅ Conferma',
            style: 'success',
            callback_data: `${FINAL_CONFIRM_PREFIX}${encodeResult1v1State(state)}`
          },
          {
            text: '✏️ Modifica',
            style: 'danger',
            callback_data: `${FINAL_EDIT_PREFIX}${encodeResult1v1State({ ...state, confirmed: false })}`
          }
        ]
      }
    ]
  }
}

// Every step is a Rich Message now — risultato1v1Menu's own reply_markup is
// never attached to a message. It still has to stay registered because
// tavolo.ts's tavoloMenu.register(risultato1v1Menu)/.submenu('ris1v1', ...)
// needs a real Menu instance as a submenu target — same reasoning as
// risultato.ts's own risultatoMenu.
export const risultato1v1Menu = new Menu<Context>('ris1v1', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(() => {})

async function sendConfirmed1v1Result(ctx: Context, state: Result1v1State) {
  try {
    // MOCKUP — a real implementation would insert into
    // tournament_round_results once there's a live pairing_uuid to attach
    // it to, same gap as risultato.ts's own sendConfirmedResult.
    const outcome = outcomeAt(state.outcomeIndex ?? 0)
    await Promise.all([
      ctx.editMessageText({ blocks: [summaryTableBlock(outcome, 'Risultato inviato')] }),
      ctx.answerCallbackQuery()
    ])
  } catch {
    await answerLoadError(ctx)
  }
}

// Modifica keeps the pick as-is, only resetting confirmed — matches
// risultato.ts's own editState reasoning, just for the one field here.
function editState(state: Result1v1State): Result1v1State {
  return { ...state, confirmed: false }
}

// Shared entry point for both /risultato (when MOCK_FORMAT is '1v1') and
// tavolo.ts's own "Inserisci risultati" button.
export async function openRisultato1v1(ctx: Context) {
  await showRichStep(ctx, outcomeRichMessage(INITIAL_STATE))
}

// Extracted so it can be reused verbatim by t.me/<bot>?start=risultato —
// see deepLinks.ts and risultato.ts's own risultatoCommandHandler, which
// delegates here when MOCK_FORMAT is '1v1'.
export async function risultato1v1CommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage(outcomeRichMessage(INITIAL_STATE))
}

registerDeepLink('risultato1v1', risultato1v1CommandHandler)

// No separate /risultato1v1 typed command — reached only via /risultato's
// own MOCK_FORMAT branch or /tavolo's button (user decision 2026-09-12:
// one command, format-detected, not two commands to remember).
export function registerRisultato1v1Handlers(bot: Bot) {
  bot.use(risultato1v1Menu)

  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data

    if (data.startsWith(OUTCOME_PICK_PREFIX)) {
      try {
        const state = decodeResult1v1State(data.slice(OUTCOME_PICK_PREFIX.length))
        await showRichStep(ctx, outcomeRichMessage(state))
      } catch {
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(OUTCOME_CONFIRM_PREFIX)) {
      try {
        const state = decodeResult1v1State(data.slice(OUTCOME_CONFIRM_PREFIX.length))
        await showRichStep(ctx, finalRichMessage(state))
      } catch {
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(FINAL_EDIT_PREFIX)) {
      try {
        const state = decodeResult1v1State(data.slice(FINAL_EDIT_PREFIX.length))
        await showRichStep(ctx, outcomeRichMessage(editState(state)))
      } catch {
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(FINAL_CONFIRM_PREFIX)) {
      try {
        const state = decodeResult1v1State(data.slice(FINAL_CONFIRM_PREFIX.length))
        await sendConfirmed1v1Result(ctx, state)
      } catch {
        await answerLoadError(ctx)
      }
      return
    }

    await next()
  })
}
