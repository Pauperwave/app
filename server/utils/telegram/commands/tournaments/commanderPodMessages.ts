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
export const DROP_ASK_PREFIX = 'cmddrop:'
export const DROP_CONFIRM_PREFIX = 'cmddropok:'
export const DROP_CANCEL_PREFIX = 'cmddropno:'
export const DROP_UNDO_PREFIX = 'cmddropundo:'

// 'me' (suicide) or an index into pod.opponents — short enough to fit
// Telegram's callback_data limit alongside a full pairing uuid, same reason
// matchReport.ts encodes an outcome index instead of a score pair.
export type KillTarget = 'me' | number

function killTargetName(pod: LivePod, target: KillTarget): string {
  return target === 'me' ? 'Te stesso (suicidio)' : (pod.opponents[target]?.name ?? '?')
}

export function killTargetUuid(pod: LivePod, target: KillTarget): string {
  return target === 'me' ? pod.myPlayerUuid : (pod.opponents[target]?.playerUuid ?? '')
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

// 2x2 grid, same as mockups/risultato.ts's own killsRichMessage
// (KILLS_ROW_SIZE) — not one flat row.
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

// Pre-confirm: same shape as mockups/risultato.ts's own finalRichMessage —
// summary + "Confermi?" + Conferma/Modifica. Data's already saved (every
// pick wrote immediately), so Conferma here only sends the same two
// follow-up tables the mockup sends, it doesn't write anything new.
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

// ─── Drop (leave the tournament) ────────────────────────────────────────────
// Offered after the result is confirmed, as its own message so the result
// summary above stays intact. A drop takes effect from the next round: this
// round's result still counts and the player stays in the standings.
// Pointless on the last round, so the prompt isn't sent there.
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

// Same table shape as mockups/risultato.ts's own votesReceivedTableBlock —
// one row per opponent with a ✓ in the categories they voted for this
// player, totals bold in the last row.
export function votesReceivedTableBlock(
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
export function scoreSummaryTableBlock(score: PodScore) {
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
