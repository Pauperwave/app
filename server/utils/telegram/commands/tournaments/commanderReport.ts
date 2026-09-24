// server\utils\telegram\commands\tournaments\commanderReport.ts
// Real (non-mockup) Commander pod flow: comandante, posizione, uccisioni,
// voti. Same linear pick-then-confirm wizard mockups/risultato.ts always
// had (it guides the player through exactly what needs collecting, in
// order) — restored 2026-09-24 after an initial "hub" redesign was
// rejected. The only real change from the mockup: each pick writes
// immediately (saveCommanderPosition/recordKill/removeKillBetween/
// castVote), same "write now, don't wait" philosophy as the 1v1 flow's own
// matchReport.ts, instead of the mockup's everything-in-callback_data,
// nothing-persisted-until-the-end shape. "✏️ Modifica" from the final step
// just walks back to the position step — nothing to reset, every pick is
// already saved. Replaces the old MOCKUP flow (mockups/tavolo.ts's
// MOCK_TABLE + mockups/risultato.ts), which moved to a hidden demo command
// (see mockups/commanderDemo.ts).
import type { Bot, Context } from 'grammy'
import type { InlineQueryResultArticle, InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'

import { requireLinkedAssociate, resolveAssociateUuidByChatId } from '../account/linking'
import { registerDeepLink } from '../../deepLinks'
import { answerLoadError, requireChatId } from '../callbackErrors'
import { showRichStep, twoColumnFactsTable } from '../mockups/richStepHelpers'
import { fetchLivePod, fetchPodScoreSummary, type LivePod } from './commanderPodData'

// ─── Commander search (Scryfall) ────────────────────────────────────────────
// Same is:commander live search mockups/tavolo.ts used to do — only the
// destination changed (a real write via selectCommanderDeck instead of just
// echoing a confirmation).
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

const COMMANDER_MESSAGE_PREFIX = '🎴 Comandante: '

// ─── Callback payload prefixes ──────────────────────────────────────────────
const POS_PICK_PREFIX = 'cmdpospk:'
const POS_CONFIRM_PREFIX = 'cmdposok:'
const KILL_TOGGLE_PREFIX = 'cmdkltg:'
const KILL_CONFIRM_PREFIX = 'cmdklok:'
const VOTE_PICK_PREFIX = 'cmdvtpk:'
const VOTE_CONFIRM_PREFIX = 'cmdvtok:'
const FINAL_DONE_PREFIX = 'cmdfdone:'
const FINAL_EDIT_PREFIX = 'cmdfedit:'

// 'me' (suicide) or an index into pod.opponents — short enough to fit
// Telegram's callback_data limit alongside a full pairing uuid, same reason
// matchReport.ts encodes an outcome index instead of a score pair.
type KillTarget = 'me' | number

function killTargetName(pod: LivePod, target: KillTarget): string {
  return target === 'me' ? 'Te stesso (suicidio)' : (pod.opponents[target]?.name ?? '?')
}

function killTargetUuid(pod: LivePod, target: KillTarget): string {
  return target === 'me' ? pod.myPlayerUuid : (pod.opponents[target]?.playerUuid ?? '')
}

// ─── Rich messages (pick-then-confirm, one step at a time) ─────────────────
const POSITIONS = [1, 2, 3, 4]

function positionRichMessage(pod: LivePod): InputRichMessage {
  const seatCount = pod.opponents.length + 1
  const blocks: InputRichMessage['blocks'] = [
    { type: 'paragraph', text: '🏅 Che piazzamento hai fatto al tavolo?' },
    {
      type: 'buttons',
      buttons: POSITIONS.filter(position => position <= seatCount).map((position) => {
        const isSelected = pod.myPosition === position
        return {
          text: `${isSelected ? '⭐ ' : ''}${position}°`,
          style: isSelected ? 'success' as const : undefined,
          callback_data: `${POS_PICK_PREFIX}${pod.pairingUuid}:${position}`
        }
      })
    }
  ]
  if (pod.myPosition !== null) {
    blocks.push({
      type: 'buttons',
      buttons: [{ text: '➡️ Conferma', style: 'primary', callback_data: `${POS_CONFIRM_PREFIX}${pod.pairingUuid}` }]
    })
  }
  return { blocks }
}

function killsRichMessage(pod: LivePod): InputRichMessage {
  const targets: KillTarget[] = [...pod.opponents.map((_, index) => index), 'me']
  const buttons = targets.map((target) => {
    const isPicked = pod.myKilledUuids.includes(killTargetUuid(pod, target))
    return {
      text: `${isPicked ? '💀' : '⬜'} ${killTargetName(pod, target)}`,
      style: isPicked ? 'danger' as const : undefined,
      callback_data: `${KILL_TOGGLE_PREFIX}${pod.pairingUuid}:${target}`
    }
  })
  return {
    blocks: [
      { type: 'paragraph', text: '💀 Chi hai eliminato?\n\nTocca per selezionare/deselezionare, poi conferma.' },
      { type: 'buttons', buttons },
      {
        type: 'buttons',
        buttons: [{
          text: '➡️ Conferma uccisioni',
          style: 'primary',
          callback_data: `${KILL_CONFIRM_PREFIX}${pod.pairingUuid}`
        }]
      }
    ]
  }
}

function voteRichMessage(pod: LivePod, voteType: 'brew' | 'play'): InputRichMessage {
  const heading = voteType === 'brew'
    ? '🃏 Voto del mazzo (2 punti)\n\nA chi lo assegni?'
    : '🎬 Voto della giocata (1 punto)\n\nA chi lo assegni?'
  const currentUuid = voteType === 'brew' ? pod.myVoteByType.brew : pod.myVoteByType.play
  const typeChar = voteType === 'brew' ? 'b' : 'p'

  const blocks: InputRichMessage['blocks'] = [
    { type: 'paragraph', text: heading },
    {
      type: 'buttons',
      buttons: pod.opponents.map((opponent, index) => {
        const isSelected = currentUuid === opponent.playerUuid
        return {
          text: `${isSelected ? '⭐ ' : ''}${opponent.name}`,
          style: isSelected ? 'success' as const : undefined,
          callback_data: `${VOTE_PICK_PREFIX}${pod.pairingUuid}:${typeChar}:${index}`
        }
      })
    }
  ]
  if (currentUuid !== null) {
    blocks.push({
      type: 'buttons',
      buttons: [{
        text: '➡️ Conferma',
        style: 'primary',
        callback_data: `${VOTE_CONFIRM_PREFIX}${pod.pairingUuid}:${typeChar}`
      }]
    })
  }
  return { blocks }
}

type PodScore = Awaited<ReturnType<typeof fetchPodScoreSummary>>

function finalRichMessage(pod: LivePod, score: PodScore): InputRichMessage {
  const voteLabel = (uuid: string | null) => uuid
    ? (pod.opponents.find(o => o.playerUuid === uuid)?.name ?? '?')
    : 'nessuno'

  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: '🧾 Riepilogo del turno' },
    twoColumnFactsTable('Salvato', [
      ['🎴 Comandante', pod.myCommanderName ?? 'non impostato'],
      ['🏅 Posizionamento', pod.myPosition ? `${pod.myPosition}°` : '-'],
      ['💀 Uccisioni', pod.myKilledUuids.length ? String(pod.myKilledUuids.length) : 'Nessuna'],
      ['🃏 Voto mazzo', voteLabel(pod.myVoteByType.brew)],
      ['🎬 Voto giocata', voteLabel(pod.myVoteByType.play)]
    ])
  ]
  if (score) {
    blocks.push(twoColumnFactsTable('Punteggio del turno', [
      ['🏅 Posizionamento', `${score.scoreRank} pt`],
      ['💀 Uccisioni', `${score.killScore} pt`],
      ['🃏 Voti mazzo', `${score.brewScore} pt`],
      ['🎬 Voti giocata', `${score.playScore} pt`],
      ['Totale', `${score.totalScore} pt`]
    ]))
  }
  blocks.push({
    type: 'buttons',
    buttons: [
      { text: '✅ Fatto', style: 'success', callback_data: `${FINAL_DONE_PREFIX}${pod.pairingUuid}` },
      { text: '✏️ Modifica', style: 'danger', callback_data: `${FINAL_EDIT_PREFIX}${pod.pairingUuid}` }
    ]
  })
  return { blocks }
}

// ─── Menu (entry point from /tavolo) ────────────────────────────────────────
// autoAnswer/onMenuOutdated: false — same reasoning as tavoloMenu's own
// comment (mockups/tavolo.ts): every .dynamic() here reads live data, the
// plugin's own staleness heuristic would false-positive on every render.
const commanderPodMenu = new Menu<Context>('cmdpod', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic((_ctx, range) => {
  range.switchInlineCurrent('🎴 Imposta comandante', '')
  range.row()
  range.text('✍️ Inserisci risultato', async (ctx) => {
    const pod = await requirePod(ctx)
    if (pod) await showRichStep(ctx, positionRichMessage(pod))
  })
})

// Resolves the caller's own live pod fresh from the chat — every handler
// below re-fetches rather than trusting anything threaded through a
// callback_data payload, same reasoning as matchReport.ts's own requireTable.
async function requirePod(ctx: Context): Promise<LivePod | null> {
  const associateUuid = await requireLinkedAssociate(ctx)
  if (!associateUuid) {
    await ctx.answerCallbackQuery().catch(() => {})
    return null
  }
  const pod = await fetchLivePod(associateUuid)
  if (!pod) {
    await ctx.answerCallbackQuery({ text: 'Questo tavolo non è più aperto.', show_alert: true }).catch(() => {})
    return null
  }
  return pod
}

// /tavolo and /risultato: true if the chat's associate sits at a Commander
// pod being played, false to let the caller fall back further.
export async function replyWithLiveCommanderPod(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id
  if (!chatId) return false

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return false

  const pod = await fetchLivePod(associateUuid)
  if (!pod) return false

  const place = pod.tableNumber === null ? '🪑 Il tuo tavolo' : `🪑 Tavolo ${pod.tableNumber}`
  await ctx.replyWithRichMessage({
    blocks: [
      { type: 'heading', size: 3, text: place },
      {
        type: 'paragraph',
        text: `${pod.tournamentName} · Round ${pod.roundNumber}\n\nGiochi con: ${pod.opponents.map(o => o.name).join(', ')}`
      }
    ]
  }, { reply_markup: commanderPodMenu })
  return true
}

registerDeepLink('commander-pod', replyWithLiveCommanderPod)

export function registerCommanderReportHandlers(bot: Bot) {
  bot.use(commanderPodMenu)

  bot.on('inline_query', async (ctx, next) => {
    if (ctx.inlineQuery.chat_type !== 'sender') return next()

    const query = ctx.inlineQuery.query.trim()
    if (query.length < 2) {
      await ctx.answerInlineQuery([], { cache_time: 0 })
      return
    }

    const cards = await searchCommanders(query)
    const results: InlineQueryResultArticle[] = cards.map((card, index) => ({
      type: 'article',
      id: String(index),
      title: card.name,
      description: card.type_line,
      thumbnail_url: card.image_uris?.small,
      input_message_content: { message_text: `${COMMANDER_MESSAGE_PREFIX}${card.name}` }
    }))
    await ctx.answerInlineQuery(results, { cache_time: 0 })
  })

  // Picking an inline result posts it as a normal message — recognized by
  // its marker prefix, same convention as mockups/tavolo.ts used to.
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.message.text.startsWith(COMMANDER_MESSAGE_PREFIX)) return next()

    const associateUuid = await resolveAssociateUuidByChatId(ctx.chat.id)
    const pod = associateUuid ? await fetchLivePod(associateUuid) : null
    if (!pod) {
      await ctx.reply('Non ho trovato un tavolo Commander aperto per te in questo momento.')
      return
    }

    const name = ctx.message.text.slice(COMMANDER_MESSAGE_PREFIX.length)
    const card = await fetchCommanderByName(name)
    const imageUrl = card ? cardImageUrl(card) : null

    await selectCommanderDeck(telegramServiceSupabaseClient(), {
      tournamentUuid: pod.tournamentUuid,
      pairingUuid: pod.pairingUuid,
      playerUuid: pod.myPlayerUuid,
      commander1Name: name,
      commander2Name: null
    })

    const blocks: InputRichMessage['blocks'] = []
    if (imageUrl) blocks.push({ type: 'photo', photo: { type: 'photo', media: imageUrl } })
    blocks.push({ type: 'paragraph', text: `✅ Comandante impostato per questo turno: ${name}` })
    await ctx.replyWithRichMessage({ blocks })
  })

  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data

    if (data.startsWith(POS_PICK_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const [, position] = data.slice(POS_PICK_PREFIX.length).split(':')
        const pod = await requirePod(ctx)
        if (!pod) return
        await saveCommanderPosition(telegramServiceSupabaseClient(), {
          tournamentUuid: pod.tournamentUuid,
          pairingUuid: pod.pairingUuid,
          playerUuid: pod.myPlayerUuid,
          position: Number(position)
        })
        const updated = await requirePod(ctx)
        if (updated) await showRichStep(ctx, positionRichMessage(updated))
      } catch (error) {
        console.error('Commander position-pick handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(POS_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (pod) await showRichStep(ctx, killsRichMessage(pod))
      } catch (error) {
        console.error('Commander position-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(KILL_TOGGLE_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const [, rawTarget] = data.slice(KILL_TOGGLE_PREFIX.length).split(':')
        const target: KillTarget = rawTarget === 'me' ? 'me' : Number(rawTarget)
        const pod = await requirePod(ctx)
        if (!pod) return

        const killedPlayerUuid = killTargetUuid(pod, target)
        const supabase = telegramServiceSupabaseClient()
        if (pod.myKilledUuids.includes(killedPlayerUuid)) {
          await removeKillBetween(supabase, {
            pairingUuid: pod.pairingUuid, killerUuid: pod.myPlayerUuid, killedPlayerUuid
          })
        } else {
          await recordKill(supabase, {
            tournamentUuid: pod.tournamentUuid,
            pairingUuid: pod.pairingUuid,
            killerUuid: pod.myPlayerUuid,
            killedPlayerUuid
          })
        }
        const updated = await requirePod(ctx)
        if (updated) await showRichStep(ctx, killsRichMessage(updated))
      } catch (error) {
        console.error('Commander kill-toggle handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(KILL_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (pod) await showRichStep(ctx, voteRichMessage(pod, 'brew'))
      } catch (error) {
        console.error('Commander kill-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(VOTE_PICK_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const [, typeChar, rawIndex] = data.slice(VOTE_PICK_PREFIX.length).split(':')
        const voteType = typeChar === 'b' ? 'brew' as const : 'play' as const
        const pod = await requirePod(ctx)
        if (!pod) return
        const opponent = pod.opponents[Number(rawIndex)]
        if (!opponent) return

        await castVote(telegramServiceSupabaseClient(), {
          tournamentUuid: pod.tournamentUuid,
          pairingUuid: pod.pairingUuid,
          voterUuid: pod.myPlayerUuid,
          votedPlayerUuid: opponent.playerUuid,
          voteType
        })
        const updated = await requirePod(ctx)
        if (updated) await showRichStep(ctx, voteRichMessage(updated, voteType))
      } catch (error) {
        console.error('Commander vote-pick handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(VOTE_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const [, typeChar] = data.slice(VOTE_CONFIRM_PREFIX.length).split(':')
        const pod = await requirePod(ctx)
        if (!pod) return
        if (typeChar === 'b') {
          await showRichStep(ctx, voteRichMessage(pod, 'play'))
        } else {
          const score = await fetchPodScoreSummary(pod)
          await showRichStep(ctx, finalRichMessage(pod, score))
        }
      } catch (error) {
        console.error('Commander vote-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(FINAL_DONE_PREFIX)) {
      await ctx.answerCallbackQuery({ text: '✅ Dati già salvati.' }).catch(() => {})
      return
    }

    if (data.startsWith(FINAL_EDIT_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (pod) await showRichStep(ctx, positionRichMessage(pod))
      } catch (error) {
        console.error('Commander final-edit handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    await next()
  })
}
