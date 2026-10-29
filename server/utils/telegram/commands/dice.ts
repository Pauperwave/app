// server\utils\telegram\commands\dice.ts
import type { Bot, Context } from 'grammy'
import { registerDeepLink } from '../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

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

// bot.command(), not commands.command(): they stay out of the "/" picker and out of /help, like the
// other hidden commands
export function registerDiceCommands(bot: Bot) {
  bot.command('dado', dadoCommandHandler)
  bot.command('moneta', monetaCommandHandler)
  bot.command('tira', tiraCommandHandler)
}
