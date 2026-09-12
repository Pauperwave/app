// server\utils\telegram\commands\dice.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { registerDeepLink } from '../deepLinks'

// Telegram's own sendDice generates the result server-side (verifiably
// fair — the bot can't fake it) and renders as a real animated die
// client-side, so a classic d6 needs no RNG of our own at all.
async function dadoCommandHandler(ctx: Context) {
  await ctx.replyWithDice('🎲')
}

registerDeepLink('dado', dadoCommandHandler)

// Telegram has no native "coin flip" dice type — this one needs our own RNG.
async function monetaCommandHandler(ctx: Context) {
  const result = Math.random() < 0.5 ? 'Testa' : 'Croce'
  await ctx.replyWithRichMessage({ markdown: `🪙 ${result}!` })
}

registerDeepLink('moneta', monetaCommandHandler)

const DEFAULT_DIE_SIDES = 20
const MAX_DIE_SIDES = 1000

// /tira [facce] — Telegram's dice types cap at 6 faces (🎯/🏀/⚽/🎳; 🎰 is a
// 64-value slot machine, not a die), so anything bigger — a d20 for the
// handful of MTG cards/rules that call for one, d100, ... — needs our own
// RNG. Defaults to d20 with no argument, the actual MTG use case.
async function tiraCommandHandler(ctx: Context) {
  const raw = (ctx.match as string | undefined)?.trim()
  const sides = raw ? Number(raw) : DEFAULT_DIE_SIDES

  if (!Number.isInteger(sides) || sides < 2 || sides > MAX_DIE_SIDES) {
    await ctx.replyWithRichMessage({
      markdown: `⚠️ Numero di facce non valido. Usa un intero tra 2 e ${MAX_DIE_SIDES} (es. /tira 20).`
    })
    return
  }

  const roll = Math.floor(Math.random() * sides) + 1
  await ctx.replyWithRichMessage({ markdown: `🎲 d${sides} → **${roll}**` })
}

registerDeepLink('tira', tiraCommandHandler)

export function registerDiceCommands(commands: CommandGroup<Context>) {
  commands.command('dado', 'Tira un dado a 6 facce', dadoCommandHandler)
  commands.command('moneta', 'Testa o croce', monetaCommandHandler)
  commands.command('tira', 'Tira un dado — es. /tira 20 (default d20)', tiraCommandHandler)
}
