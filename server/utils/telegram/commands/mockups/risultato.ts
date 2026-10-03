// server\utils\telegram\commands\mockups\risultato.ts
import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'

import { answerLoadError } from '../callbackErrors'
import { showRichStep, twoColumnFactsTable } from './richStepHelpers'

// MOCKUP: no live-write flow yet (docs/architecture/telegram-bot.md); Commander is set at round
// start via /tavolo
const MOCK_OPPONENTS = ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi']

// Kill targets include yourself (Commander has real suicide cases); vote targets stay
// MOCK_OPPONENTS-only
const SELF_KILL_TARGET = 'Te stesso (suicidio)'
const MOCK_KILL_TARGETS = [...MOCK_OPPONENTS, SELF_KILL_TARGET]
const POSITION_LABELS = Array.from({ length: MOCK_OPPONENTS.length + 1 }, (_, i) => `${i + 1}°`)

const NONE = '-'

// killMask: one bit per MOCK_KILL_TARGETS index, more compact in a callback payload than a list of
// indices
interface ResultState {
  position: number | null
  positionConfirmed: boolean
  killMask: number
  killsConfirmed: boolean
  deckVoteIndex: number | null
  deckVoteConfirmed: boolean
  playVoteIndex: number | null
  playVoteConfirmed: boolean
}

const INITIAL_STATE: ResultState = {
  position: null,
  positionConfirmed: false,
  killMask: 0,
  killsConfirmed: false,
  deckVoteIndex: null,
  deckVoteConfirmed: false,
  playVoteIndex: null,
  playVoteConfirmed: false
}

function encodeResultState(state: ResultState): string {
  return [
    state.position ?? NONE,
    state.positionConfirmed ? 1 : 0,
    state.killMask,
    state.killsConfirmed ? 1 : 0,
    state.deckVoteIndex ?? NONE,
    state.deckVoteConfirmed ? 1 : 0,
    state.playVoteIndex ?? NONE,
    state.playVoteConfirmed ? 1 : 0
  ].join(':')
}

// Callers fall back to answerLoadError() when this throws, but `Number(undefined)` is NaN, not an
// error: validate shape and parsed numbers explicitly so a garbled payload can't decode into a
// wrong ResultState.
function decodeResultState(raw: string): ResultState {
  const parts = raw.split(':')
  if (parts.length !== 8) throw new Error(`Malformed result state payload: "${raw}"`)

  const [
    position, positionConfirmed, killMask, killsConfirmed,
    deckVoteIndex, deckVoteConfirmed, playVoteIndex, playVoteConfirmed
  ] = parts

  const optionalIndex = (value: string | undefined): number | null => {
    if (value === undefined) throw new Error(`Malformed result state payload: "${raw}"`)
    if (value === NONE) return null
    const parsed = Number(value)
    if (Number.isNaN(parsed)) throw new Error(`Malformed result state payload: "${raw}"`)
    return parsed
  }
  const mask = Number(killMask)
  if (Number.isNaN(mask)) throw new Error(`Malformed result state payload: "${raw}"`)

  return {
    position: optionalIndex(position),
    positionConfirmed: positionConfirmed === '1',
    killMask: mask,
    killsConfirmed: killsConfirmed === '1',
    deckVoteIndex: optionalIndex(deckVoteIndex),
    deckVoteConfirmed: deckVoteConfirmed === '1',
    playVoteIndex: optionalIndex(playVoteIndex),
    playVoteConfirmed: playVoteConfirmed === '1'
  }
}

function killedNames(killMask: number): string[] {
  return MOCK_KILL_TARGETS.filter((_, index) => (killMask & (1 << index)) !== 0)
}

// No slashes, so it never matches @grammyjs/menu's id/row/col/payload format. None may prefix
// another (startsWith() would misroute the longer one).
const POSITION_PICK_PREFIX = 'rkpositionpick:'
const POSITION_CONFIRM_PREFIX = 'rkpositionok:'
const KILL_TOGGLE_PREFIX = 'rktoggle:'
const KILL_CONFIRM_PREFIX = 'rkconfirm:'
const DECK_VOTE_PICK_PREFIX = 'rkdeckpick:'
const DECK_VOTE_CONFIRM_PREFIX = 'rkdeckok:'
const PLAY_VOTE_PICK_PREFIX = 'rkplaypick:'
const PLAY_VOTE_CONFIRM_PREFIX = 'rkplayok:'
const FINAL_CONFIRM_PREFIX = 'rkfconfirm:'
const FINAL_EDIT_PREFIX = 'rkedit:'

function killButton(state: ResultState, name: string, index: number) {
  const bit = 1 << index
  const isPicked = (state.killMask & bit) !== 0
  const nextState = { ...state, killMask: state.killMask ^ bit }
  return {
    text: `${isPicked ? '💀' : '⬜'} ${name}`,
    style: isPicked ? 'danger' as const : undefined,
    callback_data: `${KILL_TOGGLE_PREFIX}${encodeResultState(nextState)}`
  }
}

const KILLS_ROW_SIZE = 2

// Multiselect, so it keeps its own toggle+confirm shape instead of pickRichMessage(); 2x2 grid, one
// buttons block per row
function killsRichMessage(state: ResultState): InputRichMessage {
  const buttons = MOCK_KILL_TARGETS.map((name, index) => killButton(state, name, index))
  const buttonRows = []
  for (let i = 0; i < buttons.length; i += KILLS_ROW_SIZE) {
    buttonRows.push({ type: 'buttons' as const, buttons: buttons.slice(i, i + KILLS_ROW_SIZE) })
  }

  return {
    blocks: [
      { type: 'paragraph', text: '💀 Chi hai eliminato?\n\nTocca per selezionare/deselezionare, poi conferma.' },
      ...buttonRows,
      {
        type: 'buttons',
        buttons: [{
          text: '➡️ Conferma uccisioni',
          style: 'primary',
          callback_data: `${KILL_CONFIRM_PREFIX}${encodeResultState({ ...state, killsConfirmed: true })}`
        }]
      }
    ]
  }
}

// Pick-then-confirm shape for every single-pick step (position, deck vote, play vote): picking
// re-renders the message with that option highlighted and a Conferma button; only Conferma
// advances. oneRowPerOption: for name-labeled options, since a shared row wrapped on narrow
// screens.
function pickRichMessage(
  heading: string,
  labels: string[],
  selectedIndex: number | null,
  pickPrefix: string,
  confirmPrefix: string,
  buildPickedState: (index: number) => ResultState,
  confirmedState: ResultState,
  oneRowPerOption = false
): InputRichMessage {
  const optionButtons = labels.map((label, index) => {
    const isSelected = selectedIndex === index
    return {
      // ⭐ not ✅, which means "completed"/"registered" elsewhere (tournaments/line.ts)
      text: `${isSelected ? '⭐' : ''} ${label}`.trim(),
      style: isSelected ? 'success' as const : undefined,
      callback_data: `${pickPrefix}${encodeResultState(buildPickedState(index))}`
    }
  })
  const optionRows = oneRowPerOption
    ? optionButtons.map(button => ({ type: 'buttons' as const, buttons: [button] }))
    : [{ type: 'buttons' as const, buttons: optionButtons }]

  const blocks: InputRichMessage['blocks'] = [
    { type: 'paragraph', text: heading },
    ...optionRows
  ]
  if (selectedIndex !== null) {
    blocks.push({
      type: 'buttons',
      buttons: [{
        text: '➡️ Conferma',
        style: 'primary',
        callback_data: `${confirmPrefix}${encodeResultState(confirmedState)}`
      }]
    })
  }
  return { blocks }
}

function positionRichMessage(state: ResultState): InputRichMessage {
  return pickRichMessage(
    '🏅 Posizione finale\n\nChe piazzamento hai fatto al tavolo?',
    POSITION_LABELS,
    state.position !== null ? state.position - 1 : null,
    POSITION_PICK_PREFIX,
    POSITION_CONFIRM_PREFIX,
    index => ({ ...state, position: index + 1 }),
    { ...state, positionConfirmed: true }
  )
}

function deckVoteRichMessage(state: ResultState): InputRichMessage {
  return pickRichMessage(
    '🃏 Voto del mazzo (2️⃣ punti)\n\nA chi lo assegni?',
    MOCK_OPPONENTS,
    state.deckVoteIndex,
    DECK_VOTE_PICK_PREFIX,
    DECK_VOTE_CONFIRM_PREFIX,
    index => ({ ...state, deckVoteIndex: index }),
    { ...state, deckVoteConfirmed: true },
    true
  )
}

function playVoteRichMessage(state: ResultState): InputRichMessage {
  return pickRichMessage(
    '🎬 Voto della giocata (1️⃣ punto)\n\nA chi lo assegni?',
    MOCK_OPPONENTS,
    state.playVoteIndex,
    PLAY_VOTE_PICK_PREFIX,
    PLAY_VOTE_CONFIRM_PREFIX,
    index => ({ ...state, playVoteIndex: index }),
    { ...state, playVoteConfirmed: true },
    true
  )
}

// Table shown in both finalRichMessage (pre-confirm) and sendConfirmedResult (post-confirm), one
// row per fact
function summaryTableBlock(state: ResultState, caption: string) {
  const kills = killedNames(state.killMask)
  return twoColumnFactsTable(caption, [
    ['🏅 Posizionamento', `${state.position}°`],
    ['💀 Uccisioni', kills.length ? kills.join(', ') : 'Nessuna'],
    ['🃏 Voto mazzo', MOCK_OPPONENTS[state.deckVoteIndex ?? 0] ?? '-'],
    ['🎬 Voto giocata', MOCK_OPPONENTS[state.playVoteIndex ?? 0] ?? '-']
  ])
}

// MOCKUP: which opponents voted for the deck/play is hardcoded sample data
function votesReceivedTableBlock(deckVotePoints: number, playVotePoints: number) {
  // Plain '✓' (U+2713, no variation selector): colorful emoji have a taller line-height in Telegram
  // table cells
  // fallow-ignore-next-line code-duplication -- mockup of commanderPodMessages.ts
  const cell = (value: string | undefined) => ({
    text: value, align: 'center' as const, valign: 'middle' as const
  })
  return {
    type: 'table' as const,
    is_bordered: true as const,
    is_striped: true as const,
    caption: 'Riepilogo voti ricevuti',
    cells: [
      [
        { text: 'Da chi', is_header: true as const, align: 'left' as const, valign: 'middle' as const },
        { text: 'Mazzo', is_header: true as const, align: 'center' as const, valign: 'middle' as const },
        { text: 'Giocata', is_header: true as const, align: 'center' as const, valign: 'middle' as const }
      ],
      [{ text: MOCK_OPPONENTS[0], align: 'left' as const, valign: 'middle' as const }, cell('✓'), cell(undefined)],
      [{ text: MOCK_OPPONENTS[1], align: 'left' as const, valign: 'middle' as const }, cell(undefined), cell('✓')],
      [{ text: MOCK_OPPONENTS[2], align: 'left' as const, valign: 'middle' as const }, cell(undefined), cell('✓')],
      [
        { text: { type: 'bold' as const, text: 'Totale' }, align: 'left' as const, valign: 'middle' as const },
        { text: { type: 'bold' as const, text: `${deckVotePoints} pt` }, align: 'center' as const, valign: 'middle' as const },
        { text: { type: 'bold' as const, text: `${playVotePoints} pt` }, align: 'center' as const, valign: 'middle' as const }
      ]
    ]
  }
}

function scoreSummaryTableBlock(
  positionPoints: number, killPoints: number,
  deckVotePoints: number, playVotePoints: number, totalPoints: number
) {
  // fallow-ignore-next-line code-duplication -- mockup of commanderPodMessages.ts
  const row = (label: string, points: number) => [
    { text: label, align: 'left' as const, valign: 'middle' as const },
    { text: `${points} pt`, align: 'center' as const, valign: 'middle' as const }
  ]
  return {
    type: 'table' as const,
    is_bordered: true as const,
    is_striped: true as const,
    caption: 'Riepilogo punteggio del turno',
    cells: [
      [
        { text: 'Categoria', is_header: true as const, align: 'left' as const, valign: 'middle' as const },
        { text: 'Punti', is_header: true as const, align: 'center' as const, valign: 'middle' as const }
      ],
      row('🏅 Posizionamento', positionPoints),
      row('💀 Uccisioni', killPoints),
      row('🃏 Voti mazzo', deckVotePoints),
      row('🎬 Voti giocata', playVotePoints),
      [
        { text: { type: 'bold' as const, text: 'Totale' }, align: 'left' as const, valign: 'middle' as const },
        { text: { type: 'bold' as const, text: `${totalPoints} pt` }, align: 'center' as const, valign: 'middle' as const }
      ]
    ]
  }
}

// Modifica keeps every pick and only resets the *Confirmed flags, so each step shows its previous
// choice highlighted
function editState(state: ResultState): ResultState {
  return {
    ...state,
    positionConfirmed: false,
    killsConfirmed: false,
    deckVoteConfirmed: false,
    playVoteConfirmed: false
  }
}

function finalRichMessage(state: ResultState): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: '🧾 Riepilogo risultato' },
      summaryTableBlock(state, 'Risultato inviato'),
      { type: 'paragraph', text: 'Confermi?' },
      {
        type: 'buttons',
        buttons: [
          {
            text: '✅ Conferma',
            style: 'success',
            callback_data: `${FINAL_CONFIRM_PREFIX}${encodeResultState(state)}`
          },
          {
            text: '✏️ Modifica',
            style: 'danger',
            callback_data: `${FINAL_EDIT_PREFIX}${encodeResultState(editState(state))}`
          }
        ]
      }
    ]
  }
}

// Every step is a Rich Message, so risultatoMenu's reply_markup is never attached; it stays
// registered only as the submenu target of commanderDemo.ts's demoMenu.
export const risultatoMenu = new Menu<Context>('ris', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(() => {})

// MOCKUP scoring: no real point system exists yet for 1v1 formats
// (docs/architecture/telegram-bot.md); placeholder values
const POSITION_POINTS: Record<number, number> = { 1: 8, 2: 6, 3: 4, 4: 2 }
const KILL_POINTS = 1
const DECK_VOTE_POINTS = 2
const PLAY_VOTE_POINTS = 1
// MOCKUP: stands in for "how many opponents voted for you", which needs the live pairing flow
const MOCK_DECK_VOTES_RECEIVED = 1
const MOCK_PLAY_VOTES_RECEIVED = 2

async function sendConfirmedResult(ctx: Context, state: ResultState) {
  try {
    // MOCKUP: a real version would insert tournament_round_results.position, tournament_kills and
    // tournament_votes against a live pairing_uuid
    const positionPoints = POSITION_POINTS[state.position ?? 0] ?? 0
    const killPoints = killedNames(state.killMask).length * KILL_POINTS
    const deckVotePoints = MOCK_DECK_VOTES_RECEIVED * DECK_VOTE_POINTS
    const playVotePoints = MOCK_PLAY_VOTES_RECEIVED * PLAY_VOTE_POINTS
    const totalPoints = positionPoints + killPoints + deckVotePoints + playVotePoints

    // MOCKUP: both tables are sent once here for preview; a real version would send them once every
    // player has submitted. The four calls are independent, so concurrent; two messages, so each
    // table gets full width
    await Promise.all([
      ctx.editMessageText({
        blocks: [summaryTableBlock(state, 'Risultato inviato')]
      }),
      ctx.replyWithRichMessage({
        blocks: [votesReceivedTableBlock(deckVotePoints, playVotePoints)]
      }),
      ctx.replyWithRichMessage({
        blocks: [scoreSummaryTableBlock(
          positionPoints, killPoints, deckVotePoints, playVotePoints, totalPoints
        )]
      }),
      ctx.answerCallbackQuery()
    ])
  } catch {
    await answerLoadError(ctx)
  }
}

// Entry point for commanderDemo.ts's "Inserisci risultati (demo)" button, the only caller now that
// the real Commander flow (tournaments/commanderReport.ts) serves /tavolo's result button
export async function openRisultato(ctx: Context) {
  await showRichStep(ctx, positionRichMessage(INITIAL_STATE))
}

type PrefixedStep = [prefix: string, render: (state: ResultState) => InputRichMessage]

// Shared by richSteps (re-render the pending step) and transitions (hand off to the next step):
// same decode/render/catch shape, different table. Returns whether a prefix matched so the caller
// can try the next table.
async function tryHandleStep(ctx: Context, data: string, steps: PrefixedStep[]): Promise<boolean> {
  for (const [prefix, render] of steps) {
    if (!data.startsWith(prefix)) continue
    try {
      const state = decodeResultState(data.slice(prefix.length))
      await showRichStep(ctx, render(state))
    } catch {
      await answerLoadError(ctx)
    }
    return true
  }
  return false
}

// Bot-only, no CommandGroup: wires risultatoMenu's callback_query handling; commanderDemo.ts's
// hidden command is the only entry point
export function registerRisultatoMenu(bot: Bot) {
  bot.use(risultatoMenu)

  // Each entry re-renders the same step (a pick, still pending confirm); the *_CONFIRM_PREFIX
  // handlers hand off
  const richSteps: PrefixedStep[] = [
    [POSITION_PICK_PREFIX, positionRichMessage],
    [KILL_TOGGLE_PREFIX, killsRichMessage],
    [DECK_VOTE_PICK_PREFIX, deckVoteRichMessage],
    [PLAY_VOTE_PICK_PREFIX, playVoteRichMessage]
  ]

  // Each hands off to a different step's Rich Message: prefix -> [decode offset, next render], like
  // richSteps
  const transitions: PrefixedStep[] = [
    [POSITION_CONFIRM_PREFIX, killsRichMessage],
    [KILL_CONFIRM_PREFIX, deckVoteRichMessage],
    [DECK_VOTE_CONFIRM_PREFIX, playVoteRichMessage],
    [PLAY_VOTE_CONFIRM_PREFIX, finalRichMessage],
    [FINAL_EDIT_PREFIX, positionRichMessage]
  ]

  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data

    if (await tryHandleStep(ctx, data, richSteps)) return
    if (await tryHandleStep(ctx, data, transitions)) return

    if (data.startsWith(FINAL_CONFIRM_PREFIX)) {
      try {
        const state = decodeResultState(data.slice(FINAL_CONFIRM_PREFIX.length))
        await sendConfirmedResult(ctx, state)
      } catch {
        await answerLoadError(ctx)
      }
      return
    }
    await next()
  })
}
