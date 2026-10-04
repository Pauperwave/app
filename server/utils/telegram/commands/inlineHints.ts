// server\utils\telegram\commands\inlineHints.ts
import type { Bot } from 'grammy'
import type { InlineQueryResultArticle } from 'grammy/types'
import { PRICE_INLINE_PREFIX } from './cards/priceCard'
import { COMMANDER_QUERY_PREFIX } from '../inlinePrefixes'
import { ICONS } from '~~/server/utils/telegram/icons'

// What an inline query with no recognized prefix gets: two rows saying what can be searched. A
// result can't prefill the input field, so picking one posts its explanation in the chat.
export function buildInlineHints(botUsername: string): InlineQueryResultArticle[] {
  return [
    {
      type: 'article',
      id: 'hint-price',
      title: `${ICONS.card} ${PRICE_INLINE_PREFIX} nome carta`,
      description: 'Prezzo di una carta su CardMarket e CardTrader',
      input_message_content: {
        message_text: `Per cercare il prezzo di una carta scrivi @${botUsername} ${PRICE_INLINE_PREFIX} nome carta`
      }
    },
    {
      type: 'article',
      id: 'hint-commander',
      title: `${ICONS.commanderCard} ${COMMANDER_QUERY_PREFIX} nome comandante`,
      description: 'Imposta il tuo comandante al tavolo di un torneo Commander',
      input_message_content: {
        message_text: `Per cercare un comandante scrivi @${botUsername} ${COMMANDER_QUERY_PREFIX} nome comandante`
      }
    }
  ]
}

// Registered after every other inline handler, so only the queries nobody claimed get here
export function registerInlineHints(bot: Bot) {
  bot.on('inline_query', async (ctx) => {
    await ctx.answerInlineQuery(buildInlineHints(ctx.me.username), { cache_time: 0 })
  })
}
