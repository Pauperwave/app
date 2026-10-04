// server\utils\telegram\commands\tournaments\matchTableMessage.ts
import type { InputRichMessage } from 'grammy/types'
import { opponentsText, type TableOpponent } from '#shared/utils/tournaments/playerNotificationMessages'
import { ICONS } from '~~/server/utils/telegram/icons'

// The 1v1 table card: what /tavolo replies and what the player gets pushed when the tables are
// announced, the same message in both places:
//
//   🪑 Tavolo 1
//   Torneo di test Pauper · Round 1
//   Giochi contro: Aurelio Varchetta (@BodyBit93)
//
//   [Inserisci risultato] [Visualizza timer]

type Blocks = NonNullable<InputRichMessage['blocks']>

// `mropen:<pairingUuid>` opens the result entry (matchReport.ts handles it)
export const OPEN_RESULT_PREFIX = 'mropen:'

export interface MatchTable {
  tableNumber: number | null
  tournamentName: string
  roundNumber: number
  opponent: TableOpponent
}

// Where they sit and who they play, the two blocks every state of the card starts with
export function matchTableHeader(table: MatchTable): Blocks {
  const place = table.tableNumber === null
    ? `${ICONS.table} Il tuo tavolo`
    : `${ICONS.table} Tavolo ${table.tableNumber}`

  return [
    { type: 'heading', size: 3, text: place },
    {
      type: 'paragraph',
      text: `${table.tournamentName} · Round ${table.roundNumber}\n${opponentsText([table.opponent])}`
    }
  ]
}

export function openResultButton(pairingUuid: string) {
  return {
    text: `${ICONS.write} Inserisci risultato`,
    style: 'primary' as const,
    callback_data: `${OPEN_RESULT_PREFIX}${pairingUuid}`
  }
}

// Opens the turns Mini App, which follows the round timer of the table the player sits at. Only
// private chats can open a Mini App from a button, which is where these messages go.
export function timerButton(siteUrl: string) {
  return {
    text: `${ICONS.stopwatch} Visualizza timer`,
    web_app: { url: `${siteUrl}/telegram/turni` }
  }
}

// The card of a table still waiting for its result: the button to enter it and the timer
export function matchTableMessage(
  table: MatchTable & { pairingUuid: string },
  siteUrl: string
): InputRichMessage {
  return {
    blocks: [
      ...matchTableHeader(table),
      { type: 'buttons', buttons: [openResultButton(table.pairingUuid), timerButton(siteUrl)] }
    ]
  }
}
