// server\utils\telegram\commands\mockups\risultato.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { answerLoadError } from '../callbackErrors'

// MOCKUP — no live-write flow yet (docs/architecture/telegram-bot.md).
// Commander itself is set separately, at round start, via /tavolo.
const MOCK_OPPONENTS = ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi']

// Kill targets include yourself — Commander has real self-kill cases
// (suicide). Vote targets stay MOCK_OPPONENTS-only.
const SELF_KILL_TARGET = 'Te stesso (suicidio)'
const MOCK_KILL_TARGETS = [...MOCK_OPPONENTS, SELF_KILL_TARGET]
const POSITION_LABELS = Array.from({ length: MOCK_OPPONENTS.length + 1 }, (_, i) => `${i + 1}°`)

const NONE = '-'

// killMask: one bit per MOCK_KILL_TARGETS index — round-trips through a
// callback payload more compactly than a list of indices.
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

function decodeResultState(raw: string): ResultState {
  const [
    position, positionConfirmed, killMask, killsConfirmed,
    deckVoteIndex, deckVoteConfirmed, playVoteIndex, playVoteConfirmed
  ] = raw.split(':')
  const optionalIndex = (value: string | undefined) => value === NONE ? null : Number(value)
  return {
    position: optionalIndex(position),
    positionConfirmed: positionConfirmed === '1',
    killMask: Number(killMask),
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

// No slashes — never matches @grammyjs/menu's own id/row/col/payload
// format, so it just no-ops instead of misreading these. None may prefix
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

// Multiselect, so it keeps its own toggle+confirm shape instead of the
// single-pick pickRichMessage() below. 2x2 grid: one buttons block per row.
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

// Shared pick-then-confirm shape for every single-pick step (position,
// deck vote, play vote): picking re-renders the same message with that
// option highlighted and a Conferma button added; only Conferma advances.
function pickRichMessage(
  heading: string,
  labels: string[],
  selectedIndex: number | null,
  pickPrefix: string,
  confirmPrefix: string,
  buildPickedState: (index: number) => ResultState,
  confirmedState: ResultState
): InputRichMessage {
  const blocks: InputRichMessage['blocks'] = [
    { type: 'paragraph', text: heading },
    {
      type: 'buttons',
      buttons: labels.map((label, index) => {
        const isSelected = selectedIndex === index
        return {
          // ⭐ not ✅ — that already means "completed"/"registered"
          // elsewhere (tournaments/line.ts).
          text: `${isSelected ? '⭐' : ''} ${label}`.trim(),
          style: isSelected ? 'success' as const : undefined,
          callback_data: `${pickPrefix}${encodeResultState(buildPickedState(index))}`
        }
      })
    }
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
    { ...state, deckVoteConfirmed: true }
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
    { ...state, playVoteConfirmed: true }
  )
}

function summaryLines(state: ResultState): string[] {
  const lines = [`🏅 Posizionamento → ${state.position}°`]
  const kills = killedNames(state.killMask)
  lines.push(kills.length ? `💀 Uccisioni → ${kills.join(', ')}` : '💀 Uccisioni → nessuna')
  lines.push(
    `🗳️ Voti → mazzo: ${MOCK_OPPONENTS[state.deckVoteIndex ?? 0]}, giocata: ${MOCK_OPPONENTS[state.playVoteIndex ?? 0]}`
  )
  return lines
}

// Modifica keeps every pick as-is, only resetting the *Confirmed flags —
// each step then shows its previous choice pre-highlighted instead of blank.
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
      { type: 'heading', size: 3, text: '📋 Riepilogo risultato' },
      { type: 'paragraph', text: summaryLines(state).join('\n') },
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

// Every step is a Rich Message now — risultatoMenu's own reply_markup is
// never attached to a message. It still has to stay registered because
// tavolo.ts's tavoloMenu.register(risultatoMenu)/.submenu('ris', ...)
// needs a real Menu instance as a submenu target.
export const risultatoMenu = new Menu<Context>('ris', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(() => {})

// editMessageText only replaces reply_markup when one is passed explicitly
// — it won't clear a stale inline keyboard just because the new content is
// a rich_message instead of plain text.
function editRichMessage(ctx: Context, message: InputRichMessage) {
  return ctx.editMessageText(message, { reply_markup: { inline_keyboard: [] } })
}

// editMessageText and answerCallbackQuery are independent Telegram API
// calls — awaiting them sequentially adds a full extra round-trip of
// perceived latency to every tap for no reason, so they run concurrently.
function showRichStep(ctx: Context, message: InputRichMessage) {
  return Promise.all([editRichMessage(ctx, message), ctx.answerCallbackQuery()])
}

// MOCKUP scoring — no real point system exists yet for 1v1 formats
// (docs/architecture/telegram-bot.md's own Note on this). Placeholder
// values only, to preview the shape of a per-round score summary.
const POSITION_POINTS: Record<number, number> = { 1: 8, 2: 6, 3: 4, 4: 2 }
const KILL_POINTS = 1
const DECK_VOTE_POINTS = 2
const PLAY_VOTE_POINTS = 1
// MOCKUP — stands in for "how many opponents actually voted for you",
// which needs the pairing-live flow to know for real.
const MOCK_DECK_VOTES_RECEIVED = 1
const MOCK_PLAY_VOTES_RECEIVED = 2

async function sendConfirmedResult(ctx: Context, state: ResultState) {
  try {
    // MOCKUP — a real implementation would insert into
    // tournament_round_results.position, tournament_kills (one row per
    // kill) and tournament_votes (one row per vote) once there's a live
    // pairing_uuid to attach them to.
    const text = fmt`✅ ${FormattedString.b('Risultato registrato (anteprima)')}\n\n${FormattedString.join(summaryLines(state), '\n')}`

    const positionPoints = POSITION_POINTS[state.position ?? 0] ?? 0
    const killPoints = killedNames(state.killMask).length * KILL_POINTS
    const deckVotePoints = MOCK_DECK_VOTES_RECEIVED * DECK_VOTE_POINTS
    const playVotePoints = MOCK_PLAY_VOTES_RECEIVED * PLAY_VOTE_POINTS
    const totalPoints = positionPoints + killPoints + deckVotePoints + playVotePoints

    // MOCKUP — the table only sends once here for preview purposes; a real
    // implementation would send it once every player at the table has
    // submitted their own result. Independent of the edit above and of
    // answerCallbackQuery, so all three run concurrently.
    await Promise.all([
      ctx.editMessageText(text.text, { entities: text.entities }),
      ctx.replyWithRichMessage({
        blocks: [
          {
            type: 'table',
            is_bordered: true,
            is_striped: true,
            caption: 'Riepilogo voti ricevuti (anteprima) — quando tutti avranno votato',
            cells: [
              [
                { text: 'Da chi', is_header: true, align: 'left', valign: 'middle' },
                { text: 'Mazzo (2pt)', is_header: true, align: 'center', valign: 'middle' },
                { text: 'Giocata (1pt)', is_header: true, align: 'center', valign: 'middle' }
              ],
              [
                { text: MOCK_OPPONENTS[0], align: 'left', valign: 'middle' },
                { text: '⭐', align: 'center', valign: 'middle' },
                { align: 'center', valign: 'middle' }
              ],
              [
                { text: MOCK_OPPONENTS[1], align: 'left', valign: 'middle' },
                { align: 'center', valign: 'middle' },
                { text: '⭐', align: 'center', valign: 'middle' }
              ],
              [
                { text: MOCK_OPPONENTS[2], align: 'left', valign: 'middle' },
                { align: 'center', valign: 'middle' },
                { text: '⭐', align: 'center', valign: 'middle' }
              ],
              [
                { text: { type: 'bold', text: 'Totale' }, align: 'left', valign: 'middle' },
                { text: { type: 'bold', text: `${deckVotePoints} pt` }, align: 'center', valign: 'middle' },
                { text: { type: 'bold', text: `${playVotePoints} pt` }, align: 'center', valign: 'middle' }
              ]
            ]
          },
          {
            type: 'table',
            is_bordered: true,
            is_striped: true,
            caption: 'Riepilogo punteggio del turno (anteprima)',
            cells: [
              [
                { text: 'Categoria', is_header: true, align: 'left', valign: 'middle' },
                { text: 'Punti', is_header: true, align: 'center', valign: 'middle' }
              ],
              [
                { text: '🏅 Posizionamento', align: 'left', valign: 'middle' },
                { text: `${positionPoints} pt`, align: 'center', valign: 'middle' }
              ],
              [
                { text: '💀 Uccisioni', align: 'left', valign: 'middle' },
                { text: `${killPoints} pt`, align: 'center', valign: 'middle' }
              ],
              [
                { text: '🃏 Voto mazzo ricevuto', align: 'left', valign: 'middle' },
                { text: `${deckVotePoints} pt`, align: 'center', valign: 'middle' }
              ],
              [
                { text: '🎬 Voto giocata ricevuto', align: 'left', valign: 'middle' },
                { text: `${playVotePoints} pt`, align: 'center', valign: 'middle' }
              ],
              [
                { text: { type: 'bold', text: 'Totale' }, align: 'left', valign: 'middle' },
                { text: { type: 'bold', text: `${totalPoints} pt` }, align: 'center', valign: 'middle' }
              ]
            ]
          }
        ]
      }),
      ctx.answerCallbackQuery()
    ])
  } catch {
    await answerLoadError(ctx)
  }
}

// Shared entry point for both /risultato and tavolo.ts's own "Inserisci
// risultati" button.
export async function openRisultato(ctx: Context) {
  await showRichStep(ctx, positionRichMessage(INITIAL_STATE))
}

export function registerRisultatoCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(risultatoMenu)

  // Each entry re-renders the same step (a pick, still pending confirm) —
  // the *_CONFIRM_PREFIX handlers below hand off to the next step instead.
  const richSteps: [prefix: string, render: (state: ResultState) => InputRichMessage][] = [
    [POSITION_PICK_PREFIX, positionRichMessage],
    [KILL_TOGGLE_PREFIX, killsRichMessage],
    [DECK_VOTE_PICK_PREFIX, deckVoteRichMessage],
    [PLAY_VOTE_PICK_PREFIX, playVoteRichMessage]
  ]

  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data

    for (const [prefix, render] of richSteps) {
      if (!data.startsWith(prefix)) continue
      try {
        const state = decodeResultState(data.slice(prefix.length))
        await showRichStep(ctx, render(state))
      } catch {
        await answerLoadError(ctx)
      }
      return
    }

    // Each of these hands off to a *different* step's Rich Message —
    // prefix -> [decode offset, next render] pairs, same shape as richSteps.
    const transitions: [prefix: string, render: (state: ResultState) => InputRichMessage][] = [
      [POSITION_CONFIRM_PREFIX, killsRichMessage],
      [KILL_CONFIRM_PREFIX, deckVoteRichMessage],
      [DECK_VOTE_CONFIRM_PREFIX, playVoteRichMessage],
      [PLAY_VOTE_CONFIRM_PREFIX, finalRichMessage],
      [FINAL_EDIT_PREFIX, positionRichMessage]
    ]
    for (const [prefix, render] of transitions) {
      if (!data.startsWith(prefix)) continue
      try {
        const state = decodeResultState(data.slice(prefix.length))
        await showRichStep(ctx, render(state))
      } catch {
        await answerLoadError(ctx)
      }
      return
    }

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

  commands.command('risultato', 'Registra posizione, uccisioni e voti del tavolo', async (ctx) => {
    await ctx.replyWithRichMessage(positionRichMessage(INITIAL_STATE))
  })
}
