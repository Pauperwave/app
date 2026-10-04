// test\unit\server\telegram\matchTableMessage.test.ts
import { describe, expect, it } from 'vitest'
import {
  OPEN_RESULT_PREFIX,
  matchTableHeader,
  matchTableMessage,
  openResultButton,
  timerButton,
  type MatchTable
} from '../../../../server/utils/telegram/commands/tournaments/matchTableMessage'

const TABLE: MatchTable = {
  tableNumber: 1,
  tournamentName: 'Torneo di test Pauper',
  roundNumber: 1,
  opponent: { name: 'Aurelio Varchetta', telegramUsername: 'BodyBit93' }
}

type Message = ReturnType<typeof matchTableMessage>
type Block = NonNullable<Message['blocks']>[number]

// Flattens a rich text (string, array or styled node) to its plain characters
function plain(text: unknown): string {
  if (typeof text === 'string') return text
  if (Array.isArray(text)) return text.map(plain).join('')
  if (text && typeof text === 'object' && 'text' in text) return plain(text.text)
  return ''
}

function textOf(blocks: Block[]): string {
  return blocks
    .flatMap(block => (block.type === 'heading' || block.type === 'paragraph' ? [plain(block.text)] : []))
    .join('\n')
}

describe('matchTableHeader', () => {
  it('says where they sit, in which round and against whom, one line each', () => {
    expect(textOf(matchTableHeader(TABLE))).toBe([
      '🪑 Tavolo 1',
      'Torneo di test Pauper · Round 1\nGiochi contro: Aurelio Varchetta (@BodyBit93)'
    ].join('\n'))
  })

  it('leaves out the nickname of an opponent without one', () => {
    const text = textOf(matchTableHeader({ ...TABLE, opponent: { name: 'Aurelio Varchetta' } }))
    expect(text).toContain('Giochi contro: Aurelio Varchetta')
    expect(text).not.toContain('@')
  })

  it('falls back to a generic place when there is no table number', () => {
    expect(textOf(matchTableHeader({ ...TABLE, tableNumber: null }))).toContain('🪑 Il tuo tavolo')
  })
})

describe('the buttons', () => {
  it('opens the result entry of the pairing through a callback', () => {
    const button = openResultButton('pairing-1')
    expect(button.callback_data).toBe(`${OPEN_RESULT_PREFIX}pairing-1`)
    expect(button.text).toContain('Inserisci risultato')
  })

  it('opens the turns Mini App for the timer', () => {
    const button = timerButton('https://app.pauperwave.org')
    expect(button.web_app.url).toBe('https://app.pauperwave.org/telegram/turni')
    expect(button.text).toContain('Visualizza timer')
  })

  it('keeps the callback_data under Telegram\'s 64 byte limit', () => {
    const uuid = '0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90'
    const data = openResultButton(uuid).callback_data
    expect(new TextEncoder().encode(data).length).toBeLessThanOrEqual(64)
  })
})

describe('matchTableMessage', () => {
  const message = matchTableMessage({ ...TABLE, pairingUuid: 'pairing-1' }, 'https://app.pauperwave.org')

  it('ends with the result button and the timer button on one row', () => {
    const last = message.blocks?.at(-1)
    expect(last?.type).toBe('buttons')

    const labels = last?.type === 'buttons' ? last.buttons.map(button => plain(button.text)) : []
    expect(labels).toHaveLength(2)
    expect(labels[0]).toContain('Inserisci risultato')
    expect(labels[1]).toContain('Visualizza timer')
  })

  it('has no pointer to /tavolo: the button is right there', () => {
    expect(textOf(message.blocks ?? [])).not.toContain('/tavolo')
  })
})
