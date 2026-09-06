// server\utils\telegram\commands\mockups\vota.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { answerLoadError } from '../callbackErrors'

// MOCKUP — same placeholder pairing data as tavolo.ts (no live-write flow
// yet, see docs/architecture/telegram-bot.md); kept separate since each
// mock stands in for its own future real query, not a shared fixture.
const MOCK_OPPONENTS = ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi']

const DECK_POINTS = 2
const PLAY_POINTS = 1
const NONE = '-'

interface VoteState {
  deckIndex: number | null
  playIndex: number | null
}

const INITIAL_STATE: VoteState = {
  deckIndex: null,
  playIndex: null
}

function encodeVoteState(state: VoteState): string {
  return `${state.deckIndex ?? NONE}:${state.playIndex ?? NONE}`
}

function decodeVoteState(raw: string): VoteState {
  const [deck, play] = raw.split(':')
  return {
    deckIndex: deck === NONE ? null : Number(deck),
    playIndex: play === NONE ? null : Number(play)
  }
}

function voteMessage(state: VoteState): FormattedString {
  if (state.deckIndex === null) {
    return fmt`🗳️ ${FormattedString.b('Voto del mazzo')} (${DECK_POINTS} punti)\n\nA chi lo assegni?`
  }
  if (state.playIndex === null) {
    return fmt`🗳️ ${FormattedString.b('Voto della giocata')} (${PLAY_POINTS} punto)\n\nA chi lo assegni?`
  }
  const lines = [
    `🃏 Mazzo (${DECK_POINTS} pt) → ${MOCK_OPPONENTS[state.deckIndex]}`,
    `🎬 Giocata (${PLAY_POINTS} pt) → ${MOCK_OPPONENTS[state.playIndex]}`
  ]
  return fmt`🗳️ ${FormattedString.b('Riepilogo voti')}\n\n${FormattedString.join(lines, '\n')}\n\nConfermi?`
}

// Two rounds then a summary/confirm step, all driven by ctx.match alone —
// "« Modifica" is just a button back to the initial (both-unset) state.
// autoAnswer/onMenuOutdated: false — see calendario.ts's calendarioMenu.
const votaMenu = new Menu<Context>('vt', { autoAnswer: false, onMenuOutdated: false }).dynamic((ctx, range) => {
  // || not ?? — a bare /vota sets ctx.match to '' (not undefined), which ??
  // wouldn't substitute; decodeVoteState('') gives { deckIndex: 0, playIndex:
  // NaN } — both "not null" — jumping straight past round 1.
  const state = decodeVoteState((ctx.match as string | undefined) || encodeVoteState(INITIAL_STATE))

  if (state.deckIndex === null) {
    MOCK_OPPONENTS.forEach((name, index) => {
      const payload = encodeVoteState({ deckIndex: index, playIndex: null })
      range.row().text({ text: name, payload }, renderVoteStep)
    })
    return
  }

  if (state.playIndex === null) {
    const deckIndex = state.deckIndex
    MOCK_OPPONENTS.forEach((name, index) => {
      const payload = encodeVoteState({ deckIndex, playIndex: index })
      range.row().text({ text: name, payload }, renderVoteStep)
    })
    return
  }

  range.row().text({ text: '✅ Conferma', payload: encodeVoteState(state) }, confirmVote)
  range.row().text(
    { text: '✏️ Modifica', payload: encodeVoteState(INITIAL_STATE) },
    renderVoteStep
  )
})

async function renderVoteStep(ctx: Context & { match: string }) {
  try {
    const state = decodeVoteState(ctx.match)
    const text = voteMessage(state)
    await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: votaMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

async function confirmVote(ctx: Context & { match: string }) {
  try {
    const { deckIndex, playIndex } = decodeVoteState(ctx.match)
    if (deckIndex === null || playIndex === null) return

    // MOCKUP — a real implementation would insert into tournament_votes
    // once it has a live pairing_uuid to attach the vote to.
    const lines = [
      `🃏 Mazzo (${DECK_POINTS} pt) → ${MOCK_OPPONENTS[deckIndex]}`,
      `🎬 Giocata (${PLAY_POINTS} pt) → ${MOCK_OPPONENTS[playIndex]}`
    ]
    const text = fmt`✅ ${FormattedString.b('Voti registrati (anteprima)')}\n\n${FormattedString.join(lines, '\n')}`
    await ctx.editMessageText(text.text, { entities: text.entities })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

export function registerVotaCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(votaMenu)

  commands.command('vota', 'Vota miglior mazzo/miglior giocata', async (ctx) => {
    const text = voteMessage(INITIAL_STATE)
    await ctx.reply(text.text, { entities: text.entities, reply_markup: votaMenu })
  })
}
