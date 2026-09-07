// server\utils\telegram\commands\mockups\risultato.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { answerLoadError } from '../callbackErrors'

// MOCKUP — same placeholder pairing data as tavolo.ts/vota.ts (no live-write
// flow yet, see docs/architecture/telegram-bot.md); kept separate since each
// mock stands in for its own future real query, not a shared fixture.
const MOCK_OPPONENTS = ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi']

const NONE = '-'

// killMask: one bit per MOCK_OPPONENTS index (0-7 for 3 opponents) — a
// bitmask, not an array, since it round-trips through a callback payload
// string more compactly than a list of indices.
interface ResultState {
  position: number | null
  killMask: number
  killsConfirmed: boolean
}

const INITIAL_STATE: ResultState = {
  position: null,
  killMask: 0,
  killsConfirmed: false
}

function encodeResultState(state: ResultState): string {
  return `${state.position ?? NONE}:${state.killMask}:${state.killsConfirmed ? 1 : 0}`
}

function decodeResultState(raw: string): ResultState {
  const [position, killMask, killsConfirmed] = raw.split(':')
  return {
    position: position === NONE ? null : Number(position),
    killMask: Number(killMask),
    killsConfirmed: killsConfirmed === '1'
  }
}

function killedNames(killMask: number): string[] {
  return MOCK_OPPONENTS.filter((_, index) => (killMask & (1 << index)) !== 0)
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
  const lines = [`🏅 Posizione → ${state.position}°`]
  const kills = killedNames(state.killMask)
  lines.push(kills.length ? `💀 Uccisioni → ${kills.join(', ')}` : '💀 Uccisioni → nessuna')
  return fmt`📋 ${FormattedString.b('Riepilogo risultato')}\n\n${FormattedString.join(lines, '\n')}\n\nConfermi?`
}

// Three steps then a summary/confirm, all driven by ctx.match alone — same
// null-sentinel-per-phase shape as vota.ts's votaMenu, plus a toggle step
// for kills (multiselect, not a single pick). autoAnswer/onMenuOutdated:
// false — see calendario.ts's calendarioMenu.
export const risultatoMenu = new Menu<Context>('ris', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic((ctx, range) => {
  // || not ?? — see vota.ts's own comment on why a bare command needs this.
  const raw = (ctx.match as string | undefined) || encodeResultState(INITIAL_STATE)
  const state = decodeResultState(raw)

  if (state.position === null) {
    // 4-player pods only, matching MOCK_OPPONENTS' own 3-opponent mock —
    // a real implementation would size this from the actual pairing.
    for (let position = 1; position <= MOCK_OPPONENTS.length + 1; position++) {
      const payload = encodeResultState({ position, killMask: 0, killsConfirmed: false })
      range.row().text({ text: `${position}°`, payload }, renderResultStep)
    }
    return
  }

  if (!state.killsConfirmed) {
    MOCK_OPPONENTS.forEach((name, index) => {
      const bit = 1 << index
      const picked = (state.killMask & bit) !== 0
      const payload = encodeResultState({ ...state, killMask: state.killMask ^ bit })
      range.row().text({ text: `${picked ? '✅' : '⬜'} ${name}`, payload }, renderResultStep)
    })
    range.row().text(
      { text: '➡️ Conferma uccisioni', payload: encodeResultState({ ...state, killsConfirmed: true }) },
      renderResultStep
    )
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
    if (state.position === null) return

    // MOCKUP — a real implementation would insert into
    // tournament_round_results (position) and tournament_kills (one row
    // per kill) once there's a live pairing_uuid to attach them to.
    const lines = [`🏅 Posizione → ${state.position}°`]
    const kills = killedNames(state.killMask)
    lines.push(kills.length ? `💀 Uccisioni → ${kills.join(', ')}` : '💀 Uccisioni → nessuna')
    const text = fmt`✅ ${FormattedString.b('Risultato registrato (anteprima)')}\n\n${FormattedString.join(lines, '\n')}`
    await ctx.editMessageText(text.text, { entities: text.entities })
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

  commands.command('risultato', 'Registra posizione e uccisioni del tavolo', async (ctx) => {
    const text = resultMessage(INITIAL_STATE)
    await ctx.reply(text.text, { entities: text.entities, reply_markup: risultatoMenu })
  })
}
