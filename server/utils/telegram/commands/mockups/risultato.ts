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
const MOCK_KILL_TARGETS = [...MOCK_OPPONENTS, 'Te stesso (suicidio)']

const NONE = '-'

// killMask: one bit per MOCK_KILL_TARGETS index (0-15 for 4 targets) — a
// bitmask, not an array, since it round-trips through a callback payload
// string more compactly than a list of indices.
interface ResultState {
  position: number | null
  killMask: number
  killsConfirmed: boolean
  deckVoteIndex: number | null
  playVoteIndex: number | null
}

const INITIAL_STATE: ResultState = {
  position: null,
  killMask: 0,
  killsConfirmed: false,
  deckVoteIndex: null,
  playVoteIndex: null
}

function encodeResultState(state: ResultState): string {
  return [
    state.position ?? NONE,
    state.killMask,
    state.killsConfirmed ? 1 : 0,
    state.deckVoteIndex ?? NONE,
    state.playVoteIndex ?? NONE
  ].join(':')
}

function decodeResultState(raw: string): ResultState {
  const [position, killMask, killsConfirmed, deckVoteIndex, playVoteIndex] = raw.split(':')
  const optionalIndex = (value: string | undefined) => value === NONE ? null : Number(value)
  return {
    position: optionalIndex(position),
    killMask: Number(killMask),
    killsConfirmed: killsConfirmed === '1',
    deckVoteIndex: optionalIndex(deckVoteIndex),
    playVoteIndex: optionalIndex(playVoteIndex)
  }
}

function killedNames(killMask: number): string[] {
  return MOCK_KILL_TARGETS.filter((_, index) => (killMask & (1 << index)) !== 0)
}

// Prefixes for the kills step's own callback_data — no slashes, so
// @grammyjs/menu's own `id/row/col/payload/type+hash` parser never matches
// them (it requires numeric row/col in the first two slash-segments) and
// just no-ops (returns next()) instead of misreading them.
const KILL_TOGGLE_PREFIX = 'rktoggle:'
const KILL_CONFIRM_PREFIX = 'rkconfirm:'

// Kills step rendered as a Rich Message (grammY 1.46+) instead of a
// Menu-managed keyboard — an experiment (user request, 2026-09-07) with the
// newer styled "pill" buttons (danger/primary), which only exist on Rich
// Message button blocks, not on a plain reply_markup inline keyboard.
function killsRichMessage(state: ResultState): InputRichMessage {
  const picked = killedNames(state.killMask)
  const summary = picked.length ? `Selezionati: ${picked.join(', ')}` : 'Nessuno selezionato'

  return {
    blocks: [
      { type: 'paragraph', text: '💀 Chi hai eliminato?\n\nTocca per selezionare/deselezionare, poi conferma.' },
      { type: 'paragraph', text: summary },
      {
        type: 'buttons',
        buttons: MOCK_KILL_TARGETS.map((name, index) => {
          const bit = 1 << index
          const isPicked = (state.killMask & bit) !== 0
          const nextState = { ...state, killMask: state.killMask ^ bit }
          return {
            text: `${isPicked ? '💀' : '⬜'} ${name}`,
            style: isPicked ? 'danger' as const : undefined,
            callback_data: `${KILL_TOGGLE_PREFIX}${encodeResultState(nextState)}`
          }
        })
      },
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

function resultMessage(state: ResultState): FormattedString {
  if (state.position === null) {
    return fmt`🏅 ${FormattedString.b('Posizione finale')}\n\nChe piazzamento hai fatto al tavolo?`
  }
  if (!state.killsConfirmed) {
    const picked = killedNames(state.killMask)
    const summary = picked.length ? `Selezionati: ${picked.join(', ')}` : 'Nessuno selezionato'
    return fmt`💀 ${FormattedString.b('Chi hai eliminato?')}\n\nTocca per selezionare/deselezionare, poi conferma.\n\n${summary}`
  }
  if (state.deckVoteIndex === null) {
    return fmt`🃏 ${FormattedString.b('Voto del mazzo')} (2 punti)\n\nA chi lo assegni?`
  }
  if (state.playVoteIndex === null) {
    return fmt`🎬 ${FormattedString.b('Voto della giocata')} (1 punto)\n\nA chi lo assegni?`
  }

  const lines = [`🏅 Posizionamento → ${state.position}°`]
  const kills = killedNames(state.killMask)
  lines.push(kills.length ? `💀 Uccisioni → ${kills.join(', ')}` : '💀 Uccisioni → nessuna')
  lines.push(
    `🗳️ Voti → mazzo: ${MOCK_OPPONENTS[state.deckVoteIndex]}, giocata: ${MOCK_OPPONENTS[state.playVoteIndex]}`
  )
  return fmt`📋 ${FormattedString.b('Riepilogo risultato')}\n\n${FormattedString.join(lines, '\n')}\n\nConfermi?`
}

// Four steps then a summary/confirm, all driven by ctx.match alone — each
// step is identified by which ResultState field is still null (or, for
// kills, by killsConfirmed), a toggle step for kills (multiselect, not a
// single pick) in between. autoAnswer/onMenuOutdated: false — see
// calendario.ts's calendarioMenu.
export const risultatoMenu = new Menu<Context>('ris', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic((ctx, range) => {
  // || not ?? — a bare /risultato sets ctx.match to '' (not undefined),
  // and ?? doesn't substitute on ''; decodeResultState('') would misread
  // every field as "set" instead of falling through to INITIAL_STATE.
  const raw = (ctx.match as string | undefined) || encodeResultState(INITIAL_STATE)
  const state = decodeResultState(raw)

  if (state.position === null) {
    // Single row — 4-player pods only, matching MOCK_OPPONENTS' own
    // 3-opponent mock. A real implementation would size this from the
    // actual pairing.
    const row = range.row()
    for (let position = 1; position <= MOCK_OPPONENTS.length + 1; position++) {
      const payload = encodeResultState({ ...INITIAL_STATE, position })
      row.text({ text: `${position}°`, payload }, renderResultStep)
    }
    return
  }

  // Kills step is actually rendered as a Rich Message with its own
  // callback-styled buttons (killsRichMessage) instead of risultatoMenu's
  // reply_markup — renderResultStep intercepts and shows that instead
  // whenever it decodes a "position set, kills not confirmed" state. This
  // branch still has to build a real, same-shape row of buttons though:
  // pressing a position button makes @grammyjs/menu reconstruct THIS
  // dynamic() (with ctx.match already set to the new, post-press state) to
  // resolve the pressed button's own row/col for dispatch — with
  // onMenuOutdated: false skipping the bounds check, an empty range here
  // would crash range[row][col] with no visible error (confirmed bug class,
  // see calendario.ts's own history). The buttons below are never actually
  // shown to a user; only their existence at the right position matters.
  if (!state.killsConfirmed) {
    MOCK_KILL_TARGETS.forEach((name, index) => {
      const bit = 1 << index
      const payload = encodeResultState({ ...state, killMask: state.killMask ^ bit })
      range.row().text({ text: name, payload }, renderResultStep)
    })
    range.row().text(
      { text: '➡️ Conferma uccisioni', payload: encodeResultState({ ...state, killsConfirmed: true }) },
      renderResultStep
    )
    return
  }

  if (state.deckVoteIndex === null) {
    MOCK_OPPONENTS.forEach((name, index) => {
      const payload = encodeResultState({ ...state, deckVoteIndex: index })
      range.row().text({ text: name, payload }, renderResultStep)
    })
    return
  }

  if (state.playVoteIndex === null) {
    MOCK_OPPONENTS.forEach((name, index) => {
      const payload = encodeResultState({ ...state, playVoteIndex: index })
      range.row().text({ text: name, payload }, renderResultStep)
    })
    return
  }

  range.row().text({ text: '✅ Conferma', payload: encodeResultState(state) }, confirmResult)
  range.row().text(
    { text: '✏️ Modifica', payload: encodeResultState(INITIAL_STATE) },
    renderResultStep
  )
})

async function renderResultStep(ctx: Context & { match: string }) {
  try {
    const state = decodeResultState(ctx.match)
    if (state.position !== null && !state.killsConfirmed) {
      await ctx.editMessageText(killsRichMessage(state))
      await ctx.answerCallbackQuery()
      return
    }
    const text = resultMessage(state)
    await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: risultatoMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

async function confirmResult(ctx: Context & { match: string }) {
  try {
    const state = decodeResultState(ctx.match)
    if (
      state.position === null || state.deckVoteIndex === null || state.playVoteIndex === null
    ) return

    // MOCKUP — a real implementation would insert into
    // tournament_round_results.position, tournament_kills (one row per
    // kill) and tournament_votes (one row per vote) once there's a live
    // pairing_uuid to attach them to.
    const lines = [`🏅 Posizionamento → ${state.position}°`]
    const kills = killedNames(state.killMask)
    lines.push(kills.length ? `💀 Uccisioni → ${kills.join(', ')}` : '💀 Uccisioni → nessuna')
    lines.push(
      `🗳️ Voti → mazzo: ${MOCK_OPPONENTS[state.deckVoteIndex]}, giocata: ${MOCK_OPPONENTS[state.playVoteIndex]}`
    )
    const text = fmt`✅ ${FormattedString.b('Risultato registrato (anteprima)')}\n\n${FormattedString.join(lines, '\n')}`
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
              { text: '✅', align: 'center', valign: 'middle' },
              { align: 'center', valign: 'middle' }
            ],
            [
              { text: MOCK_OPPONENTS[1], align: 'left', valign: 'middle' },
              { align: 'center', valign: 'middle' },
              { text: '✅', align: 'center', valign: 'middle' }
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
  const text = resultMessage(INITIAL_STATE)
  await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: risultatoMenu })
  await ctx.answerCallbackQuery()
}

export function registerRisultatoCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(risultatoMenu)

  // Kills step's own callback handling — its buttons aren't routed through
  // risultatoMenu at all (see killsRichMessage's own comment on why), so
  // they need their own listener. Registered before commands/other menus
  // don't matter here: KILL_TOGGLE_PREFIX/KILL_CONFIRM_PREFIX never collide
  // with @grammyjs/menu's own callback_data format, which just no-ops.
  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data
    if (data.startsWith(KILL_TOGGLE_PREFIX)) {
      try {
        const state = decodeResultState(data.slice(KILL_TOGGLE_PREFIX.length))
        await ctx.editMessageText(killsRichMessage(state))
        await ctx.answerCallbackQuery()
      } catch {
        await answerLoadError(ctx)
      }
      return
    }
    if (data.startsWith(KILL_CONFIRM_PREFIX)) {
      try {
        const state = decodeResultState(data.slice(KILL_CONFIRM_PREFIX.length))
        const text = resultMessage(state)
        await ctx.editMessageText(text.text, {
          entities: text.entities, reply_markup: risultatoMenu
        })
        await ctx.answerCallbackQuery()
      } catch {
        await answerLoadError(ctx)
      }
      return
    }
    await next()
  })

  commands.command('risultato', 'Registra posizione, uccisioni e voti del tavolo', async (ctx) => {
    const text = resultMessage(INITIAL_STATE)
    await ctx.reply(text.text, { entities: text.entities, reply_markup: risultatoMenu })
  })
}
