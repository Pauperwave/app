// server\utils\telegram\commands\test.ts
import type { Bot, Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import { PRICE_INLINE_PREFIX } from './cards/priceCard'
import { ICONS } from '~~/server/utils/telegram/icons'

// Cards to try the price search with, one button each
const TEST_CARDS = ['Winota', 'Lightning Bolt', 'Counterspell']

// Telegram can only prefill the input field with an inline query ("@bot € Winota"), not with a
// plain command, so the buttons fill in the price search and leave the sending to the player
function testKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  for (const card of TEST_CARDS) {
    keyboard.switchInlineCurrent(`${ICONS.card} ${card}`, `${PRICE_INLINE_PREFIX} ${card}`).row()
  }
  return keyboard
}

async function testCommandHandler(ctx: Context) {
  await ctx.reply(
    `${ICONS.settings} Prova la ricerca prezzi: tocca una carta, il messaggio si precompila e ti basta inviarlo.`,
    { reply_markup: testKeyboard() }
  )
}

// bot.command(), not commands.command(): it stays out of the "/" picker and out of /help, like the
// other hidden commands
export function registerTestCommand(bot: Bot) {
  bot.command('test', testCommandHandler)
}
