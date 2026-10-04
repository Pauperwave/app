// server\utils\telegram\commands\dice.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { registerDeepLink } from '../deepLinks'
import { ICONS } from '../icons'

// Telegram's sendDice generates the result server-side (verifiably fair) and renders an animated
// die, so a classic d6 needs no RNG of our own
async function dadoCommandHandler(ctx: Context) {
  await ctx.replyWithDice(ICONS.dice)
}

registerDeepLink('dado', dadoCommandHandler)

// Telegram has no native coin-flip dice type, so this one needs our own RNG
async function monetaCommandHandler(ctx: Context) {
  const result = Math.random() < 0.5 ? 'Testa' : 'Croce'
  await ctx.replyWithRichMessage({ markdown: `${ICONS.coin} ${result}!` })
}

registerDeepLink('moneta', monetaCommandHandler)

const DEFAULT_DIE_SIDES = 20
const MAX_DIE_SIDES = 1000

// /tira [facce]: Telegram's dice types cap at 6 faces (🎰 is a slot machine, not a die), so anything
// bigger (d20, d100, ...) needs our own RNG. Defaults to d20, the actual MTG use case.
async function tiraCommandHandler(ctx: Context) {
  const raw = (ctx.match as string | undefined)?.trim()
  const sides = raw ? Number(raw) : DEFAULT_DIE_SIDES

  if (!Number.isInteger(sides) || sides < 2 || sides > MAX_DIE_SIDES) {
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Numero di facce non valido. Usa un intero tra 2 e ${MAX_DIE_SIDES} (es. /tira 20).`
    })
    return
  }

  const roll = Math.floor(Math.random() * sides) + 1
  await ctx.replyWithRichMessage({ markdown: `${ICONS.dice} d${sides} → **${roll}**` })
}

registerDeepLink('tira', tiraCommandHandler)

export function registerDiceCommands(commands: CommandGroup<Context>) {
  commands.command('dado', 'Tira un dado a 6 facce', dadoCommandHandler)
  commands.command('moneta', 'Testa o croce', monetaCommandHandler)
  commands.command('tira', 'Tira un dado — es. /tira 20 (default d20)', tiraCommandHandler)
}
