// server\utils\telegram\commands\tournaments\commanderPodMessages.ts
// The rich messages of the Commander pod flow in Telegram, and the callback_data prefixes their
// buttons carry: the result wizard (position, kills, votes, summary), the drop prompts and the two
// follow-up tables. Pure functions of the pod — the handlers that send them live in
// commanderResultWizard.ts and commanderDrop.ts.
import type { InputRichMessage } from 'grammy/types'

import { twoColumnFactsTable } from '../mockups/richStepHelpers'
import type { fetchPodScoreSummary, LivePod } from './commanderPodData'

// ─── Callback payload prefixes ──────────────────────────────────────────────
export const POS_PICK_PREFIX = 'cmdpospk:'
export const POS_CONFIRM_PREFIX = 'cmdposok:'
export const KILL_TOGGLE_PREFIX = 'cmdkltg:'
export const KILL_CONFIRM_PREFIX = 'cmdklok:'
export const VOTE_PICK_PREFIX = 'cmdvtpk:'
export const VOTE_CONFIRM_PREFIX = 'cmdvtok:'
export const FINAL_CONFIRM_PREFIX = 'cmdfok:'
export const FINAL_EDIT_PREFIX = 'cmdfedit:'
export const FINAL_REFRESH_PREFIX = 'cmdfrf:'
export const DROP_ASK_PREFIX = 'cmddrop:'
export const DROP_CONFIRM_PREFIX = 'cmddropok:'
export const DROP_CANCEL_PREFIX = 'cmddropno:'
export const DROP_UNDO_PREFIX = 'cmddropundo:'

// 'me' (suicide) or an index into pod.opponents: short enough for callback_data next to a pairing
// uuid (as matchReport.ts does)
export type KillTarget = 'me' | number

function killTargetName(pod: LivePod, target: KillTarget): string {
  return target === 'me' ? 'Te stesso (suicidio)' : (pod.opponents[target]?.name ?? '?')
}

export function killTargetUuid(pod: LivePod, target: KillTarget): string {
  return target === 'me' ? pod.myPlayerUuid : (pod.opponents[target]?.playerUuid ?? '')
}

// The target a kill-toggle button carries: 'me', or the index of an opponent. Null for anything
// else: callback_data is client-controlled, never trusted blindly.
export function parseKillTarget(raw: string | undefined): KillTarget | null {
  if (raw === 'me') return 'me'

  return raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : null
}

// Whether a parsed target is a seat of this table: yourself, or an opponent that exists
export function isKillTarget(pod: LivePod, target: KillTarget): boolean {
  return target === 'me' || !!pod.opponents[target]
}

// The one-letter vote type a vote button carries in callback_data, and back ('b' brew, anything
// else play)
export function voteTypeChar(voteType: 'brew' | 'play'): string {
  return voteType === 'brew' ? 'b' : 'p'
}

export function voteTypeOf(typeChar: string | undefined): 'brew' | 'play' {
  return typeChar === 'b' ? 'brew' : 'play'
}

// ─── Rich messages (pick-then-confirm, one step at a time) ─────────────────
export const POSITIONS = [1, 2, 3, 4]

export function positionRichMessage(pod: LivePod): InputRichMessage {
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

// 2x2 grid, like mockups/risultato.ts's killsRichMessage, not one flat row
const KILLS_ROW_SIZE = 2

export function killsRichMessage(pod: LivePod): InputRichMessage {
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

export function voteRichMessage(pod: LivePod, voteType: 'brew' | 'play'): InputRichMessage {
  const heading = voteType === 'brew'
    ? '🃏 Voto del mazzo (2 punti)\n\nA chi lo assegni?'
    : '🎬 Voto della giocata (1 punto)\n\nA chi lo assegni?'
  const currentUuid = voteType === 'brew' ? pod.myVoteByType.brew : pod.myVoteByType.play
  const typeChar = voteTypeChar(voteType)

  // One button per row (1xN) for deck/play votes: a shared row wrapped opponent names on narrow
  // screens
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

// Names of who this player killed ("Te stesso" for suicide), joined by comma like
// mockups/risultato.ts, not a bare count
function killedNamesFor(pod: LivePod): string[] {
  return pod.myKilledUuids.map((uuid) => {
    if (uuid === pod.myPlayerUuid) return 'Te stesso'
    return pod.opponents.find(o => o.playerUuid === uuid)?.name ?? '?'
  })
}

// Same 4 rows as mockups/risultato.ts's summaryTableBlock; the commander is never part of this
// wizard (set earlier via /tavolo)
export function resultFactsFor(pod: LivePod): [label: string, value: string][] {
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

// Pre-confirm: summary + "Confermi?" + Conferma/Modifica. Data is already saved (every pick writes
// at once), so Conferma only sends the two follow-up tables
export function finalRichMessage(pod: LivePod): InputRichMessage {
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

// Shown after confirming while others at the table are still filling in their result; the refresh
// button re-checks and sends the tables once nobody is pending
export function waitingForOthersRichMessage(
  pod: LivePod,
  pendingNames: string[]
): InputRichMessage {
  return {
    blocks: [
      {
        type: 'paragraph',
        text: `⏳ Mancano ancora: ${pendingNames.join(', ')}.\n\nQuando avranno inserito posizione e voti, `
          + 'premi Aggiorna per ricevere i riepiloghi dei voti e del punteggio.'
      },
      {
        type: 'buttons',
        buttons: [{
          text: '🔄 Aggiorna',
          callback_data: `${FINAL_REFRESH_PREFIX}${pod.pairingUuid}`
        }]
      }
    ]
  }
}

// ─── Drop (leave the tournament) ──────────────────────────────────────────── Offered after the
// result is confirmed, as its own message so the summary stays intact. A drop takes effect from the
// next round (this round still counts), so it is pointless on the last round and not sent there.
export function isLastRound(pod: LivePod): boolean {
  return pod.roundCount !== null && pod.roundNumber >= pod.roundCount
}

export function dropAskRichMessage(pod: LivePod): InputRichMessage {
  return {
    blocks: [
      {
        type: 'paragraph',
        text: 'Vuoi lasciare il torneo? Se droppi non verrai più inserito nei tavoli dai prossimi round.'
      },
      {
        type: 'buttons',
        buttons: [{ text: '🚪 Droppa dal torneo', style: 'danger', callback_data: `${DROP_ASK_PREFIX}${pod.pairingUuid}` }]
      }
    ]
  }
}

export function dropConfirmRichMessage(pod: LivePod): InputRichMessage {
  return {
    blocks: [
      {
        type: 'paragraph',
        text: 'Confermi il drop? Il risultato di questo round resta valido, ma non verrai inserito nei tavoli dai prossimi round.'
      },
      {
        type: 'buttons',
        buttons: [
          { text: '✅ Sì, droppa', style: 'danger', callback_data: `${DROP_CONFIRM_PREFIX}${pod.pairingUuid}` },
          { text: '↩️ Annulla', callback_data: `${DROP_CANCEL_PREFIX}${pod.pairingUuid}` }
        ]
      }
    ]
  }
}

export function dropCancelledRichMessage(): InputRichMessage {
  return { blocks: [{ type: 'paragraph', text: '👍 Nessun drop: resti nel torneo.' }] }
}

export function dropAlreadyDoneRichMessage(pod: LivePod): InputRichMessage {
  return {
    blocks: [
      { type: 'paragraph', text: '🚪 Hai già droppato: non verrai inserito nei tavoli dai prossimi round.' },
      {
        type: 'buttons',
        buttons: [{ text: '↩️ Annulla drop', callback_data: `${DROP_UNDO_PREFIX}${pod.pairingUuid}` }]
      }
    ]
  }
}

export function dropDoneRichMessage(pod: LivePod): InputRichMessage {
  return {
    blocks: [
      {
        type: 'paragraph',
        text: '🚪 Hai droppato dal torneo: non verrai inserito nei tavoli dai prossimi round.'
      },
      {
        type: 'buttons',
        buttons: [{ text: '↩️ Annulla drop', callback_data: `${DROP_UNDO_PREFIX}${pod.pairingUuid}` }]
      }
    ]
  }
}

// One row per opponent with a ✓ in the categories they voted for this player, totals bold in the
// last row
export function votesReceivedTableBlock(
  votesReceived: { voterName: string, brew: boolean, play: boolean }[], score: PodScore
) {
  // fallow-ignore-next-line code-duplication -- real table the risultato.ts mockup mirrors
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

// Same table shape as mockups/risultato.ts's scoreSummaryTableBlock
// fallow-ignore-next-line code-duplication -- mirrored by the risultato.ts mockup
export function scoreSummaryTableBlock(score: PodScore) {
  // fallow-ignore-next-line code-duplication -- real table the risultato.ts mockup mirrors
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
