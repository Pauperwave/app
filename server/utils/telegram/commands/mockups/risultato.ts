// server\utils\telegram\commands\mockups\risultato.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import type { InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { answerLoadError } from '../callbackErrors'

// MOCKUP — same placeholder pairing data as tavolo.ts (no live-write flow
// yet, see docs/architecture/telegram-bot.md); kept separate since each
// mock stands in for its own future real query, not a shared fixture.
// Commander itself isn't reported here — that happens separately, as soon
// as the round starts, via /tavolo's own "Imposta comandante" (real-time
// data entry, this only covers what's known once the round has ended).
const MOCK_OPPONENTS = ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi']

// Kill targets include yourself — Commander has real self-kill cases
// (suicide via combat damage to yourself, a wipe that hits your own board,
// etc.), so "who did you eliminate" can't be opponents-only. Vote targets
// (below) stay MOCK_OPPONENTS-only — you don't vote for your own deck/play.
const SELF_KILL_TARGET = 'Te stesso (suicidio)'
const MOCK_KILL_TARGETS = [...MOCK_OPPONENTS, SELF_KILL_TARGET]

const NONE = '-'

// killMask: one bit per MOCK_KILL_TARGETS index (0-15 for 4 targets) — a
// bitmask, not an array, since it round-trips through a callback payload
// string more compactly than a list of indices.
interface ResultState {
  position: number | null
  killMask: number
  killsConfirmed: boolean
  deckVoteIndex: number | null
  // Separate from deckVoteIndex/playVoteIndex being non-null: a pick is
  // only *tentative* (still shown highlighted on the same step, with a
  // Conferma button) until this flips true — same "pick, then a separate
  // confirm" shape as kills, added per user request (2026-09-07: "tasto di
  // conferma per ogni voto").
  deckVoteConfirmed: boolean
  playVoteIndex: number | null
  playVoteConfirmed: boolean
}

const INITIAL_STATE: ResultState = {
  position: null,
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
    position, killMask, killsConfirmed,
    deckVoteIndex, deckVoteConfirmed, playVoteIndex, playVoteConfirmed
  ] = raw.split(':')
  const optionalIndex = (value: string | undefined) => value === NONE ? null : Number(value)
  return {
    position: optionalIndex(position),
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

// Prefixes for the Rich Message steps' own callback_data — no slashes, so
// @grammyjs/menu's own `id/row/col/payload/type+hash` parser never matches
// them (it requires numeric row/col in the first two slash-segments) and
// just no-ops (returns next()) instead of misreading them.
// None of these may be a prefix of another (e.g. 'rkdeckpick:' vs a
// hypothetical 'rkdeck:') — startsWith() would match both for the longer
// one's payloads, misrouting it to the shorter prefix's handler.
const POSITION_PICK_PREFIX = 'rkposition:'
const KILL_TOGGLE_PREFIX = 'rktoggle:'
const KILL_CONFIRM_PREFIX = 'rkconfirm:'
const DECK_VOTE_PICK_PREFIX = 'rkdeckpick:'
const DECK_VOTE_CONFIRM_PREFIX = 'rkdeckok:'
const PLAY_VOTE_PICK_PREFIX = 'rkplaypick:'
const PLAY_VOTE_CONFIRM_PREFIX = 'rkplayok:'
const FINAL_CONFIRM_PREFIX = 'rkfconfirm:'
const FINAL_EDIT_PREFIX = 'rkedit:'

// Kills step rendered as a Rich Message (grammY 1.46+) instead of a
// Menu-managed keyboard — an experiment (user request, 2026-09-07) with the
// newer styled "pill" buttons (danger/primary), which only exist on Rich
// Message button blocks, not on a plain reply_markup inline keyboard.
// One InputRichBlockButtons = one row (max 8 buttons) — opponents and
// yourself split across two rows since they're conceptually different
// (suicide vs. eliminating someone else), not just for layout's sake.
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

function killsRichMessage(state: ResultState): InputRichMessage {
  const buttons = MOCK_KILL_TARGETS.map((name, index) => killButton(state, name, index))
  // 2x2 grid (user request, 2026-09-07) — one InputRichBlockButtons block
  // per row, chunked instead of one block per target.
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

// Deck/play vote are single-pick, not multiselect, but still get their own
// explicit confirm step (user request, 2026-09-07: "tasto di conferma per
// ogni voto") — same pick-then-confirm shape as kills. Picking re-renders
// this same step with that opponent highlighted and a Conferma button
// added; the Conferma button is the only thing that actually advances.
function voteRichMessage(
  heading: string,
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
      buttons: MOCK_OPPONENTS.map((name, index) => {
        const isSelected = selectedIndex === index
        return {
          // 🔘 not ✅ — that already means "completed" (STATUS_ICON in
          // tournaments/line.ts) and "registered" (personalIcon there too);
          // reusing it here for "selected" would collide with both.
          text: `${isSelected ? '🔘' : ''} ${name}`.trim(),
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
        text: '➡️ Conferma voto',
        style: 'primary',
        callback_data: `${confirmPrefix}${encodeResultState(confirmedState)}`
      }]
    })
  }
  return { blocks }
}

function deckVoteRichMessage(state: ResultState): InputRichMessage {
  return voteRichMessage(
    '🃏 Voto del mazzo (2 punti)\n\nA chi lo assegni?',
    state.deckVoteIndex,
    DECK_VOTE_PICK_PREFIX,
    DECK_VOTE_CONFIRM_PREFIX,
    index => ({ ...state, deckVoteIndex: index }),
    { ...state, deckVoteConfirmed: true }
  )
}

function playVoteRichMessage(state: ResultState): InputRichMessage {
  return voteRichMessage(
    '🎬 Voto della giocata (1 punto)\n\nA chi lo assegni?',
    state.playVoteIndex,
    PLAY_VOTE_PICK_PREFIX,
    PLAY_VOTE_CONFIRM_PREFIX,
    index => ({ ...state, playVoteIndex: index }),
    { ...state, playVoteConfirmed: true }
  )
}

// Last step to move onto a Rich Message (user request, 2026-09-07) — now
// nothing in this whole flow uses risultatoMenu's own reply_markup at all.
// Single-pick, no separate confirm (unlike the vote steps) — matches this
// step's original behavior, never explicitly asked to change. Highlights
// state.position when set (Modifica carries it forward, via editState
// below) instead of always starting blank.
function positionRichMessage(state: ResultState): InputRichMessage {
  const buttons = []
  for (let position = 1; position <= MOCK_OPPONENTS.length + 1; position++) {
    const isSelected = state.position === position
    buttons.push({
      text: `${isSelected ? '🔘' : ''} ${position}°`.trim(),
      style: isSelected ? 'success' as const : undefined,
      callback_data: `${POSITION_PICK_PREFIX}${encodeResultState({ ...state, position })}`
    })
  }
  return {
    blocks: [
      { type: 'paragraph', text: '🏅 Posizione finale\n\nChe piazzamento hai fatto al tavolo?' },
      { type: 'buttons', buttons }
    ]
  }
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

// Modifica reopens the position step but keeps every pick as-is (only the
// *Confirmed flags reset) — user request, 2026-09-07: re-visiting any step
// should show the previous choice already highlighted as a pill instead of
// starting blank, since positionRichMessage/killsRichMessage/voteRichMessage
// all already render whatever state they're given.
function editState(state: ResultState): ResultState {
  return {
    ...state,
    killsConfirmed: false,
    deckVoteConfirmed: false,
    playVoteConfirmed: false
  }
}

// Same Rich Message pill-button treatment as every other step (user
// request, 2026-09-07) — Conferma/Modifica are no longer risultatoMenu
// buttons, so this dynamic() (below) never needs a branch or a row/col-
// matching dummy for the final state either.
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

// Empty placeholder Menu — every step in this flow (including position,
// as of 2026-09-07) is a Rich Message now, so risultatoMenu's own
// reply_markup is never actually attached to a message anywhere. It still
// has to exist and stay registered purely so tavolo.ts's own
// `tavoloMenu.register(risultatoMenu)` / `.submenu('ris', openRisultato)`
// keeps working — @grammyjs/menu requires a real registered Menu instance
// as a submenu's target, even one whose own dynamic() never renders
// anything (openRisultato replaces the message with a Rich Message
// instead of ever letting this menu's own keyboard show).
export const risultatoMenu = new Menu<Context>('ris', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(() => {})

// Switching a message from risultatoMenu's own reply_markup to a Rich
// Message leaves the old inline keyboard attached underneath otherwise —
// editMessageText only replaces reply_markup when one is explicitly passed,
// it doesn't clear it just because the new content is a rich_message
// instead of plain text (confirmed bug report, 2026-09-07: kills step was
// showing both the Rich Message's own pill buttons *and* the stale
// position-step keyboard below it).
function editRichMessage(ctx: Context, message: InputRichMessage) {
  return ctx.editMessageText(message, { reply_markup: { inline_keyboard: [] } })
}

// Plain function, not a Menu handler — invoked directly from
// registerRisultatoCommand's FINAL_CONFIRM_PREFIX handling instead, since
// finalRichMessage's Conferma button isn't a risultatoMenu button either.
async function sendConfirmedResult(ctx: Context, state: ResultState) {
  try {
    // MOCKUP — a real implementation would insert into
    // tournament_round_results.position, tournament_kills (one row per
    // kill) and tournament_votes (one row per vote) once there's a live
    // pairing_uuid to attach them to.
    const text = fmt`✅ ${FormattedString.b('Risultato registrato (anteprima)')}\n\n${FormattedString.join(summaryLines(state), '\n')}`
    await ctx.editMessageText(text.text, { entities: text.entities })

    // MOCKUP — a real implementation only sends this once every player at
    // the table has submitted their own result (needs the same pairing-live
    // flow as everything else here); shown immediately for preview purposes.
    // Rich Messages (grammY 1.46+, ctx.replyWithRichMessage) support a real
    // `table` block — used here instead of faking columns with a monospace
    // <pre> block, user request 2026-09-07.
    await ctx.replyWithRichMessage({
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
              { text: '🔘', align: 'center', valign: 'middle' },
              { align: 'center', valign: 'middle' }
            ],
            [
              { text: MOCK_OPPONENTS[1], align: 'left', valign: 'middle' },
              { align: 'center', valign: 'middle' },
              { text: '🔘', align: 'center', valign: 'middle' }
            ],
            [
              { text: MOCK_OPPONENTS[2], align: 'left', valign: 'middle' },
              { align: 'center', valign: 'middle' },
              { align: 'center', valign: 'middle' }
            ],
            [
              { text: { type: 'bold', text: 'Totale' }, align: 'left', valign: 'middle' },
              { text: { type: 'bold', text: '2 pt' }, align: 'center', valign: 'middle' },
              { text: { type: 'bold', text: '1 pt' }, align: 'center', valign: 'middle' }
            ]
          ]
        }
      ]
    })

    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// Shared entry point for both /risultato itself and tavolo.ts's own
// "Inserisci risultati" button (same message-replace shape as
// tournament/detail.ts's openTournamentDetail, one caller per trigger).
export async function openRisultato(ctx: Context) {
  await editRichMessage(ctx, positionRichMessage(INITIAL_STATE))
  await ctx.answerCallbackQuery()
}

export function registerRisultatoCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(risultatoMenu)

  // Kills/deck-vote/play-vote/final steps' own callback handling — none of
  // their buttons are routed through risultatoMenu (see killsRichMessage's
  // own comment on why), so they need their own listener. Registered
  // before commands/other menus don't matter here: none of these prefixes
  // collide with @grammyjs/menu's own callback_data format, which just
  // no-ops. Each entry re-renders the *same* step (a pick, still pending
  // confirm) — the *-CONFIRM_PREFIX handlers below hand off to the next
  // step instead, since committing a pick is what actually advances.
  const richSteps: [prefix: string, render: (state: ResultState) => InputRichMessage][] = [
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
        await editRichMessage(ctx, render(state))
        await ctx.answerCallbackQuery()
      } catch {
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(POSITION_PICK_PREFIX)) {
      try {
        const state = decodeResultState(data.slice(POSITION_PICK_PREFIX.length))
        await editRichMessage(ctx, killsRichMessage(state))
        await ctx.answerCallbackQuery()
      } catch {
        await answerLoadError(ctx)
      }
      return
    }
    if (data.startsWith(KILL_CONFIRM_PREFIX)) {
      try {
        const state = decodeResultState(data.slice(KILL_CONFIRM_PREFIX.length))
        await editRichMessage(ctx, deckVoteRichMessage(state))
        await ctx.answerCallbackQuery()
      } catch {
        await answerLoadError(ctx)
      }
      return
    }
    if (data.startsWith(DECK_VOTE_CONFIRM_PREFIX)) {
      try {
        const state = decodeResultState(data.slice(DECK_VOTE_CONFIRM_PREFIX.length))
        await editRichMessage(ctx, playVoteRichMessage(state))
        await ctx.answerCallbackQuery()
      } catch {
        await answerLoadError(ctx)
      }
      return
    }
    if (data.startsWith(PLAY_VOTE_CONFIRM_PREFIX)) {
      try {
        const state = decodeResultState(data.slice(PLAY_VOTE_CONFIRM_PREFIX.length))
        await editRichMessage(ctx, finalRichMessage(state))
        await ctx.answerCallbackQuery()
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
    if (data.startsWith(FINAL_EDIT_PREFIX)) {
      try {
        // Payload (built by editState()) carries every previous pick
        // forward, not INITIAL_STATE — that's the whole point of Modifica
        // showing them pre-filled instead of blank.
        const state = decodeResultState(data.slice(FINAL_EDIT_PREFIX.length))
        await editRichMessage(ctx, positionRichMessage(state))
        await ctx.answerCallbackQuery()
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
