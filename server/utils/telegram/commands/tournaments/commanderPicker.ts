// server\utils\telegram\commands\tournaments\commanderPicker.ts
// Setting the commander from Telegram: the inline search (the commanders already played first, then
// Scryfall), the second commander of a partner/Background pairing, and what happens when the player
// picks a result. The partner rules are the same as the website's (shared/utils/commanders).
import { InlineKeyboard } from 'grammy'
import type { Bot, Context } from 'grammy'
import type { InlineQueryResultArticle, InputRichMessage } from 'grammy/types'

import { resolveAssociateUuidByChatId } from '../account/linking'
import { fetchCommanderHistory, fetchLivePod, type LivePod } from './commanderPodData'
import { replyWithLiveCommanderPod } from './commanderPod'
import { COMMANDER_QUERY_PREFIX, SECOND_COMMANDER_QUERY_PREFIX } from '../../inlinePrefixes'
import { ICONS } from '~~/server/utils/telegram/icons'

// The live pod of whoever wrote in this chat; null (after telling them) when they have none open
async function fetchOwnPodOrReply(ctx: Context): Promise<LivePod | null> {
  const associateUuid = ctx.chat ? await resolveAssociateUuidByChatId(ctx.chat.id) : null
  const pod = associateUuid ? await fetchLivePod(associateUuid) : null
  if (!pod) {
    await ctx.reply('Non ho trovato un tavolo Commander aperto per te in questo momento.')
  }
  return pod
}

// ─── Commander search (Scryfall) ──────────────────────────────────────────── The same
// is:commander live search mockups/tavolo.ts did, now ending in a real write (selectCommanderDeck)
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (Telegram bot commander search; contact: emanuelenardi.dev@gmail.com)'
const MAX_COMMANDER_RESULTS = 5

interface ScryfallCard {
  name: string
  type_line?: string
  image_uris?: { small?: string, art_crop?: string }
  card_faces?: { image_uris?: { art_crop?: string } }[]
}

async function searchCommanders(query: string): Promise<ScryfallCard[]> {
  try {
    const response = await $fetch<{ data: ScryfallCard[] }>('https://api.scryfall.com/cards/search', {
      query: { q: `${query} is:commander game:paper`, unique: 'cards', order: 'name' },
      headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
    })
    return (response.data ?? []).slice(0, MAX_COMMANDER_RESULTS)
  } catch {
    return []
  }
}

async function fetchCommanderByName(name: string): Promise<ScryfallCard | null> {
  try {
    return await $fetch<ScryfallCard>('https://api.scryfall.com/cards/named', {
      query: { exact: name },
      headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
    })
  } catch {
    return null
  }
}

function cardImageUrl(card: ScryfallCard): string | null {
  return card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop ?? null
}

const COMMANDER_MESSAGE_PREFIX = `${ICONS.commanderCard} Comandante: `
const SECOND_COMMANDER_MESSAGE_PREFIX = `${ICONS.commanderCard} Secondo comandante: `
const MAX_SECOND_COMMANDER_RESULTS = 20
const MAX_HISTORY_RESULTS = 15

// What a first commander can be paired with, by partner type — mirrors the site's commander modal.
const SECOND_COMMANDER_KIND: Record<string, string> = {
  partner: 'un altro Partner',
  partner_with: 'il suo partner',
  background_commander: 'un Background',
  background: 'una creatura che sceglie un Background',
  friends_forever: 'un altro Friends forever',
  doctors_companion: 'un Doctor\'s companion',
  companion: 'un Companion'
}

// The partner rules need the catalog; if it can't be read the commander is still saved as a plain
// one.
async function loadPartnerRules() {
  try {
    return await fetchCommanderCatalog()
  } catch (error) {
    console.error('Commander catalog unavailable for the bot:', error)
    return null
  }
}

// The commanders this player already played that match what was typed, as inline results. History
// is a nicety: if it can't be read, the search still works without it.
async function commanderHistoryResults(
  ctx: Context, search: string
): Promise<InlineQueryResultArticle[]> {
  try {
    const associateUuid = ctx.from ? await resolveAssociateUuidByChatId(ctx.from.id) : null
    if (!associateUuid) return []

    const text = search.toLowerCase()
    const history = (await fetchCommanderHistory(associateUuid))
      .filter(item => item.name.toLowerCase().includes(text))
      .slice(0, MAX_HISTORY_RESULTS)
    if (history.length === 0) return []

    const catalog = await loadPartnerRules()
    const artByName = new Map(
      (catalog?.cards ?? []).map((card): [string, string | null] => [card.name, card.artCropUrl])
    )

    return history.map((item, index) => ({
      type: 'article',
      id: `h-${index}`,
      title: item.name,
      description: `Già giocato ${item.count} ${item.count === 1 ? 'volta' : 'volte'}`
        + ` · ultimo ${new Date(item.lastPlayedDay).toLocaleDateString('it-IT')}`,
      thumbnail_url: artByName.get(item.name) ?? undefined,
      input_message_content: { message_text: `${COMMANDER_MESSAGE_PREFIX}${item.name}` }
    }))
  } catch (error) {
    console.error('Commander history unavailable for the bot:', error)
    return []
  }
}

// "+ text" inline search: only the cards that can be the second commander of the one already set.
async function answerSecondCommanderQuery(ctx: Context, search: string) {
  const associateUuid = ctx.from ? await resolveAssociateUuidByChatId(ctx.from.id) : null
  const pod = associateUuid ? await fetchLivePod(associateUuid) : null
  const catalog = pod?.myCommander1Name ? await loadPartnerRules() : null
  if (!pod?.myCommander1Name || !catalog) {
    await ctx.answerInlineQuery([], { cache_time: 0 })
    return
  }

  const allowedNames = new Set(catalog.rules.getAllowedPartners(pod.myCommander1Name))
  const text = search.trim().toLowerCase()
  const results: InlineQueryResultArticle[] = catalog.cards
    .filter(card => allowedNames.has(card.name) && card.name.toLowerCase().includes(text))
    .slice(0, MAX_SECOND_COMMANDER_RESULTS)
    .map((card, index) => ({
      type: 'article',
      id: String(index),
      title: card.name,
      description: `Secondo comandante di ${pod.myCommander1Name}`,
      thumbnail_url: card.artCropUrl ?? undefined,
      input_message_content: { message_text: `${SECOND_COMMANDER_MESSAGE_PREFIX}${card.name}` }
    }))
  await ctx.answerInlineQuery(results, { cache_time: 0 })
}

export function registerCommanderPickerHandlers(bot: Bot) {
  bot.on('inline_query', async (ctx, next) => {
    if (ctx.inlineQuery.chat_type !== 'sender') return next()

    const rawQuery = ctx.inlineQuery.query.trim()

    // "+ text" searches the cards compatible with the commander already set
    if (rawQuery.startsWith(SECOND_COMMANDER_QUERY_PREFIX)) {
      await answerSecondCommanderQuery(ctx, rawQuery.slice(SECOND_COMMANDER_QUERY_PREFIX.length))
      return
    }

    // Anything else is not a commander search: the hints answer it
    if (!rawQuery.startsWith(COMMANDER_QUERY_PREFIX)) return next()

    const query = rawQuery.slice(COMMANDER_QUERY_PREFIX.length).trim()

    // The commanders already played come first; an empty search shows just those
    const historyResults = await commanderHistoryResults(ctx, query)
    if (query.length < 2) {
      await ctx.answerInlineQuery(historyResults, { cache_time: 0 })
      return
    }

    const historyNames = new Set(historyResults.map(result => result.title))
    const cards = (await searchCommanders(query)).filter(card => !historyNames.has(card.name))
    const searchResults: InlineQueryResultArticle[] = cards.map((card, index) => ({
      type: 'article',
      id: `s-${index}`,
      title: card.name,
      description: card.type_line,
      thumbnail_url: card.image_uris?.small,
      input_message_content: { message_text: `${COMMANDER_MESSAGE_PREFIX}${card.name}` }
    }))
    await ctx.answerInlineQuery([...historyResults, ...searchResults], { cache_time: 0 })
  })

  // Picking an inline result posts it as a normal message, recognized by its marker prefix (as
  // mockups/tavolo.ts did)
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.message.text.startsWith(COMMANDER_MESSAGE_PREFIX)) return next()

    const pod = await fetchOwnPodOrReply(ctx)
    if (!pod) return

    const name = ctx.message.text.slice(COMMANDER_MESSAGE_PREFIX.length)
    const card = await fetchCommanderByName(name)
    const imageUrl = card ? cardImageUrl(card) : null

    // A "Partner with" commander has exactly one legal partner: fill it in, like the site does.
    const partnerRules = await loadPartnerRules()
    const exactPartner = partnerRules?.rules.getExactPartnerName(name) ?? null

    await selectCommanderDeck(telegramServiceSupabaseClient(), {
      tournamentUuid: pod.tournamentUuid,
      pairingUuid: pod.pairingUuid,
      playerUuid: pod.myPlayerUuid,
      commander1Name: name,
      commander2Name: exactPartner
    })

    const blocks: InputRichMessage['blocks'] = []
    if (imageUrl) blocks.push({ type: 'photo', photo: { type: 'photo', media: imageUrl } })
    blocks.push({
      type: 'paragraph',
      text: exactPartner
        ? `${ICONS.success} Comandanti impostati per questo turno: ${name} + ${exactPartner}`
        : `${ICONS.success} Comandante impostato per questo turno: ${name}`
    })
    await ctx.replyWithRichMessage({ blocks })

    // Any other pairing (Partner, Background, Friends forever, ...) is picked from the compatible
    // cards.
    const secondKind = SECOND_COMMANDER_KIND[partnerRules?.rules.getPartnerType(name) ?? '']
    const hasCompatibleCards = (partnerRules?.rules.getAllowedPartners(name).length ?? 0) > 0
    if (!exactPartner && secondKind && hasCompatibleCards) {
      await ctx.reply(`Questo comandante può avere ${secondKind}. Vuoi impostarlo?`, {
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent(`${ICONS.commanderCard} Imposta secondo comandante`, `${SECOND_COMMANDER_QUERY_PREFIX} `)
      })
    }

    // Re-send the table so its buttons end up below the confirmation, not buried above it.
    await replyWithLiveCommanderPod(ctx)
  })

  // The second commander arrives the same way, from the "+" inline search.
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.message.text.startsWith(SECOND_COMMANDER_MESSAGE_PREFIX)) return next()

    const pod = await fetchOwnPodOrReply(ctx)
    if (!pod) return
    if (!pod.myCommander1Name) {
      await ctx.reply('Imposta prima il tuo comandante, poi potrai aggiungere il secondo.')
      return
    }

    const name = ctx.message.text.slice(SECOND_COMMANDER_MESSAGE_PREFIX.length)
    const partnerRules = await loadPartnerRules()
    if (!partnerRules?.rules.getAllowedPartners(pod.myCommander1Name).includes(name)) {
      await ctx.reply(`${ICONS.warning} ${name} non è compatibile con ${pod.myCommander1Name}.`)
      return
    }

    await selectCommanderDeck(telegramServiceSupabaseClient(), {
      tournamentUuid: pod.tournamentUuid,
      pairingUuid: pod.pairingUuid,
      playerUuid: pod.myPlayerUuid,
      commander1Name: pod.myCommander1Name,
      commander2Name: name
    })

    const artUrl = partnerRules.cards.find(card => card.name === name)?.artCropUrl
    const blocks: InputRichMessage['blocks'] = []
    if (artUrl) blocks.push({ type: 'photo', photo: { type: 'photo', media: artUrl } })
    blocks.push({
      type: 'paragraph',
      text: `${ICONS.success} Comandanti impostati per questo turno: ${pod.myCommander1Name} + ${name}`
    })
    await ctx.replyWithRichMessage({ blocks })
    await replyWithLiveCommanderPod(ctx)
  })
}
