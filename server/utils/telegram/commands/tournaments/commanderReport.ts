// server\utils\telegram\commands\tournaments\commanderReport.ts
// Real (non-mockup) Commander pod flow: comandante, posizione, uccisioni,
// voti. Same linear pick-then-confirm wizard mockups/risultato.ts always
// had — same button grids too (4x1 position, 2x2 kills, 1xN votes), same
// final "Riepilogo risultato" → "✅ Conferma"/"✏️ Modifica" screen, same
// two follow-up tables (votes received, score) sent on confirm — the user
// flow is deliberately identical to the mockup (2026-09-24, corrected
// twice: first for a rejected "hub" redesign, then for these grid/final-
// screen drifts from the mockup found on first real use). The only actual
// difference: each pick writes immediately (saveCommanderPosition/
// recordKill/removeKillBetween/castVote), same "write now, don't wait"
// philosophy as the 1v1 flow's own matchReport.ts, instead of the mockup's
// everything-in-callback_data, nothing-persisted-until-confirm shape — so
// "✅ Conferma" on the final screen sends the follow-up tables but writes
// nothing new, and "✏️ Modifica" just walks back to the position step with
// nothing to reset. Replaces the old MOCKUP flow (mockups/tavolo.ts's
// MOCK_TABLE + mockups/risultato.ts), which moved to a hidden demo command
// (see mockups/commanderDemo.ts).
import type { Bot, Context } from 'grammy'
import type { InlineQueryResultArticle, InputRichMessage } from 'grammy/types'
import { Menu } from '@grammyjs/menu'

import { requireLinkedAssociate, resolveAssociateUuidByChatId } from '../account/linking'
import { registerDeepLink } from '../../deepLinks'
import { answerLoadError, requireChatId } from '../callbackErrors'
import { editRichMessage, showRichStep, twoColumnFactsTable } from '../mockups/richStepHelpers'
import {
  fetchLivePod, fetchPodScoreSummary, fetchVotesReceivedFor, type LivePod
} from './commanderPodData'

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
const FINAL_CONFIRM_PREFIX = 'cmdfok:'
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

// 2x2 grid, same as mockups/risultato.ts's own killsRichMessage
// (KILLS_ROW_SIZE) — not one flat row.
const KILLS_ROW_SIZE = 2

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
  const buttonRows: InputRichMessage['blocks'] = []
  for (let i = 0; i < buttons.length; i += KILLS_ROW_SIZE) {
    buttonRows.push({ type: 'buttons', buttons: buttons.slice(i, i + KILLS_ROW_SIZE) })
  }
  return {
    blocks: [
      { type: 'paragraph', text: '💀 Chi hai eliminato?\n\nTocca per selezionare/deselezionare, poi conferma.' },
      ...buttonRows,
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

  // One button per row (1xN), same as mockups/risultato.ts's own
  // pickRichMessage(..., oneRowPerOption: true) for deck/play votes — a
  // shared row wrapped opponent names on narrow screens.
  const optionRows: InputRichMessage['blocks'] = pod.opponents.map((opponent, index) => {
    const isSelected = currentUuid === opponent.playerUuid
    return {
      type: 'buttons',
      buttons: [{
        text: `${isSelected ? '⭐ ' : ''}${opponent.name}`,
        style: isSelected ? 'success' as const : undefined,
        callback_data: `${VOTE_PICK_PREFIX}${pod.pairingUuid}:${typeChar}:${index}`
      }]
    }
  })
  const blocks: InputRichMessage['blocks'] = [
    { type: 'paragraph', text: heading },
    ...optionRows
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

// Names of who this player killed this pod, "Te stesso" for the suicide
// target — mockups/risultato.ts's own summaryTableBlock shows the names
// joined by comma, not a bare count.
function killedNamesFor(pod: LivePod): string[] {
  return pod.myKilledUuids.map((uuid) => {
    if (uuid === pod.myPlayerUuid) return 'Te stesso'
    return pod.opponents.find(o => o.playerUuid === uuid)?.name ?? '?'
  })
}

// Same 4 rows as mockups/risultato.ts's own summaryTableBlock — comandante
// deliberately excluded, it's never part of this wizard there either (set
// separately via /tavolo's own inline search, before entering it).
function resultFactsFor(pod: LivePod): [label: string, value: string][] {
  const killed = killedNamesFor(pod)
  const voteLabel = (uuid: string | null) => uuid
    ? (pod.opponents.find(o => o.playerUuid === uuid)?.name ?? '?')
    : '-'
  return [
    ['🏅 Posizionamento', pod.myPosition ? `${pod.myPosition}°` : '-'],
    ['💀 Uccisioni', killed.length ? killed.join(', ') : 'Nessuna'],
    ['🃏 Voto mazzo', voteLabel(pod.myVoteByType.brew)],
    ['🎬 Voto giocata', voteLabel(pod.myVoteByType.play)]
  ]
}

// Pre-confirm: same shape as mockups/risultato.ts's own finalRichMessage —
// summary + "Confermi?" + Conferma/Modifica. Data's already saved (every
// pick wrote immediately), so Conferma here only sends the same two
// follow-up tables the mockup sends, it doesn't write anything new.
function finalRichMessage(pod: LivePod): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: '🧾 Riepilogo risultato' },
      twoColumnFactsTable('Da confermare', resultFactsFor(pod)),
      { type: 'paragraph', text: 'Confermi?' },
      {
        type: 'buttons',
        buttons: [
          { text: '✅ Conferma', style: 'success', callback_data: `${FINAL_CONFIRM_PREFIX}${pod.pairingUuid}` },
          { text: '✏️ Modifica', style: 'danger', callback_data: `${FINAL_EDIT_PREFIX}${pod.pairingUuid}` }
        ]
      }
    ]
  }
}

// Same table shape as mockups/risultato.ts's own votesReceivedTableBlock —
// one row per opponent with a ✓ in the categories they voted for this
// player, totals bold in the last row.
function votesReceivedTableBlock(
  votesReceived: { voterName: string, brew: boolean, play: boolean }[], score: PodScore
) {
  const cell = (value?: string) => ({ text: value, align: 'center' as const, valign: 'middle' as const })
  return {
    type: 'table' as const,
    is_bordered: true as const,
    is_striped: true as const,
    caption: 'Riepilogo voti ricevuti',
    cells: [
      [
        { text: 'Da chi', is_header: true as const, align: 'left' as const, valign: 'middle' as const },
        { text: 'Mazzo', is_header: true as const, align: 'center' as const, valign: 'middle' as const },
        { text: 'Giocata', is_header: true as const, align: 'center' as const, valign: 'middle' as const }
      ],
      ...votesReceived.map(vote => [
        { text: vote.voterName, align: 'left' as const, valign: 'middle' as const },
        cell(vote.brew ? '✓' : undefined),
        cell(vote.play ? '✓' : undefined)
      ]),
      [
        { text: { type: 'bold' as const, text: 'Totale' }, align: 'left' as const, valign: 'middle' as const },
        {
          text: { type: 'bold' as const, text: `${score?.brewScore ?? 0} pt` },
          align: 'center' as const,
          valign: 'middle' as const
        },
        {
          text: { type: 'bold' as const, text: `${score?.playScore ?? 0} pt` },
          align: 'center' as const,
          valign: 'middle' as const
        }
      ]
    ]
  }
}

// Same table shape as mockups/risultato.ts's own scoreSummaryTableBlock.
function scoreSummaryTableBlock(score: PodScore) {
  const row = (label: string, points: number) => [
    { text: label, align: 'left' as const, valign: 'middle' as const },
    { text: `${points} pt`, align: 'center' as const, valign: 'middle' as const }
  ]
  return {
    type: 'table' as const,
    is_bordered: true as const,
    is_striped: true as const,
    caption: 'Riepilogo punteggio del turno',
    cells: [
      [
        { text: 'Categoria', is_header: true as const, align: 'left' as const, valign: 'middle' as const },
        { text: 'Punti', is_header: true as const, align: 'center' as const, valign: 'middle' as const }
      ],
      row('🏅 Posizionamento', score?.scoreRank ?? 0),
      row('💀 Uccisioni', score?.killScore ?? 0),
      row('🃏 Voti mazzo', score?.brewScore ?? 0),
      row('🎬 Voti giocata', score?.playScore ?? 0),
      [
        { text: { type: 'bold' as const, text: 'Totale' }, align: 'left' as const, valign: 'middle' as const },
        {
          text: { type: 'bold' as const, text: `${score?.totalScore ?? 0} pt` },
          align: 'center' as const,
          valign: 'middle' as const
        }
      ]
    ]
  }
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
          await showRichStep(ctx, finalRichMessage(pod))
        }
      } catch (error) {
        console.error('Commander vote-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
      return
    }

    if (data.startsWith(FINAL_CONFIRM_PREFIX)) {
      if (!(await requireChatId(ctx))) return
      try {
        const pod = await requirePod(ctx)
        if (!pod) return
        // Nothing left to write — every pick already saved as it happened.
        // Same as mockups/risultato.ts's own sendConfirmedResult: edit down
        // to the plain summary, then send the votes-received and score
        // tables as their own messages (each gets its own full width).
        const [votesReceived, score] = await Promise.all([
          fetchVotesReceivedFor(pod), fetchPodScoreSummary(pod)
        ])
        await Promise.all([
          editRichMessage(ctx, {
            blocks: [twoColumnFactsTable('Risultato inviato', resultFactsFor(pod))]
          }),
          ctx.replyWithRichMessage({ blocks: [votesReceivedTableBlock(votesReceived, score)] }),
          ctx.replyWithRichMessage({ blocks: [scoreSummaryTableBlock(score)] }),
          ctx.answerCallbackQuery()
        ])
      } catch (error) {
        console.error('Commander final-confirm handler failed:', error)
        await answerLoadError(ctx)
      }
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
