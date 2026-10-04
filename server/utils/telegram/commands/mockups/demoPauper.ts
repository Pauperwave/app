// server\utils\telegram\commands\mockups\demoPauper.ts
import type { InputRichMessage } from 'grammy/types'
import { MATCH_OUTCOMES } from '#shared/utils/tournaments/matchReport'
import { twoColumnFactsTable } from './richStepHelpers'
import { disputedNoticeText } from '../tournaments/matchNotices'
import { ICONS } from '~~/server/utils/telegram/icons'

// The 1v1 (Pauper) result entry of matchReport.ts with a made-up table and opponent: same steps
// and wording, nothing is read from or written to the tournament. Stateless like the real one:
// every button says what it is for in its own callback_data.

export const DEMO_PAUPER_PREFIX = 'demop:'

const MOCK_MATCH = {
  tableNumber: 3,
  tournamentName: 'Torneo di test Pauper',
  roundNumber: 2,
  opponent: 'Aurelio Varchetta'
}

const EXAMPLE_NOTE = 'Dati di esempio — nessuna scrittura reale.'

// "open" shows the score choice, with the score picked so far when reached from "Modifica";
// "summary" and "send" always carry the score they are about
interface DemoOpenCallback {
  action: 'open'
  outcomeIndex: number | null
}

interface DemoStepCallback {
  action: 'summary' | 'send' | 'dispute'
  outcomeIndex: number
}

export type DemoPauperCallback = DemoOpenCallback | DemoStepCallback

// "demop:open", "demop:open:2", "demop:summary:2", "demop:send:2", "demop:dispute:2"
export function encodeDemoPauperCallback(callback: DemoPauperCallback): string {
  const base = `${DEMO_PAUPER_PREFIX}${callback.action}`
  return callback.outcomeIndex === null ? base : `${base}:${callback.outcomeIndex}`
}

// Null for anything that isn't one of ours: callback_data is client-controlled
export function decodeDemoPauperCallback(data: string): DemoPauperCallback | null {
  if (!data.startsWith(DEMO_PAUPER_PREFIX)) return null

  const parts = data.slice(DEMO_PAUPER_PREFIX.length).split(':')
  const action = parts[0]
  const rawIndex = parts[1]
  if (parts.length > 2) return null

  if (rawIndex === undefined) {
    return action === 'open' ? { action, outcomeIndex: null } : null
  }

  const outcomeIndex = Number(rawIndex)
  const isValidIndex = /^\d+$/.test(rawIndex) && outcomeIndex < MATCH_OUTCOMES.length
  if (!isValidIndex) return null

  if (action === 'open' || action === 'summary' || action === 'send' || action === 'dispute') {
    return { action, outcomeIndex }
  }
  return null
}

// The message each button leads to
export function demoPauperStepMessage(callback: DemoPauperCallback): InputRichMessage {
  if (callback.action === 'open') return demoPauperPickMessage(callback.outcomeIndex)
  if (callback.action === 'summary') return demoPauperSummaryMessage(callback.outcomeIndex)
  if (callback.action === 'dispute') return demoPauperDisputeMessage(callback.outcomeIndex)
  return demoPauperDoneMessage(callback.outcomeIndex)
}

function outcomeLabel(index: number): string {
  return MATCH_OUTCOMES[index]?.label ?? ''
}

// What /tavolo shows for a 1v1 before a result is in
export function demoPauperTableMessage(): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.table} Tavolo ${MOCK_MATCH.tableNumber}` },
      {
        type: 'paragraph',
        text: `${MOCK_MATCH.tournamentName} · Round ${MOCK_MATCH.roundNumber}\n\nGiochi contro: ${MOCK_MATCH.opponent}`
      },
      {
        type: 'buttons',
        buttons: [{
          text: `${ICONS.write} Inserisci risultato`,
          style: 'primary',
          callback_data: encodeDemoPauperCallback({ action: 'open', outcomeIndex: null })
        }]
      },
      { type: 'paragraph', text: EXAMPLE_NOTE }
    ]
  }
}

// currentIndex is the score already picked when reopened through "Modifica", highlighted
export function demoPauperPickMessage(currentIndex: number | null): InputRichMessage {
  return {
    blocks: [
      {
        type: 'paragraph',
        text: `${ICONS.dice} Risultato del match contro ${MOCK_MATCH.opponent}\n\nQuanti game hai vinto tu e quanti lui?`
      },
      {
        type: 'buttons',
        buttons: MATCH_OUTCOMES.map((outcome, index) => {
          const isSelected = index === currentIndex
          return {
            text: `${isSelected ? `${ICONS.selected} ` : ''}${outcome.label}`,
            style: isSelected ? 'success' as const : undefined,
            callback_data: encodeDemoPauperCallback({ action: 'summary', outcomeIndex: index })
          }
        })
      }
    ]
  }
}

export function demoPauperSummaryMessage(outcomeIndex: number): InputRichMessage {
  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.receipt} Riepilogo risultato` },
      twoColumnFactsTable('Da inviare', [
        [`${ICONS.versus} Avversario`, MOCK_MATCH.opponent],
        [`${ICONS.dice} Risultato`, outcomeLabel(outcomeIndex)]
      ]),
      {
        type: 'paragraph',
        text: `Il risultato verrà registrato subito, ${MOCK_MATCH.opponent} riceverà solo una richiesta di conferma. Lo invio?`
      },
      {
        type: 'buttons',
        buttons: [
          {
            text: `${ICONS.success} Invia`,
            style: 'success',
            callback_data: encodeDemoPauperCallback({ action: 'send', outcomeIndex })
          },
          {
            text: `${ICONS.edit} Modifica`,
            style: 'danger',
            callback_data: encodeDemoPauperCallback({ action: 'open', outcomeIndex })
          }
        ]
      }
    ]
  }
}

export function demoPauperDoneMessage(outcomeIndex: number): InputRichMessage {
  return {
    blocks: [
      {
        type: 'paragraph',
        text: `${ICONS.success} Risultato registrato: ${outcomeLabel(outcomeIndex)}\n\n`
          + `In un torneo vero avviserei ${MOCK_MATCH.opponent}: se contesta, decide l'organizzatore.`
      },
      {
        type: 'buttons',
        buttons: [{
          text: `${ICONS.failure} Contesta come ${MOCK_MATCH.opponent}`,
          style: 'danger',
          callback_data: encodeDemoPauperCallback({ action: 'dispute', outcomeIndex })
        }]
      },
      { type: 'paragraph', text: EXAMPLE_NOTE }
    ]
  }
}

// What the opponent sees after tapping "Non è corretto" on the result, and what the player who
// entered it would then be told
export function demoPauperDisputeMessage(outcomeIndex: number): InputRichMessage {
  return {
    blocks: [
      {
        type: 'paragraph',
        text: `${ICONS.warning} Risultato contestato (${outcomeLabel(outcomeIndex)}): l'organizzatore lo verificherà.`
      },
      {
        type: 'paragraph',
        text: `Chi ha inserito il risultato riceverebbe: ${disputedNoticeText(MOCK_MATCH.opponent, MOCK_MATCH.roundNumber)}`
      },
      { type: 'paragraph', text: EXAMPLE_NOTE }
    ]
  }
}
