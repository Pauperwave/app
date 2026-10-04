// test\unit\server\telegram\demoPauper.test.ts
import { describe, expect, it } from 'vitest'
import { MATCH_OUTCOMES } from '../../../../shared/utils/tournaments/matchReport'
import {
  decodeDemoPauperCallback,
  demoPauperPickMessage,
  demoPauperStepMessage,
  demoPauperTableMessage,
  encodeDemoPauperCallback,
  type DemoPauperCallback
} from '../../../../server/utils/telegram/commands/mockups/demoPauper'

type Message = ReturnType<typeof demoPauperTableMessage>
type Block = NonNullable<Message['blocks']>[number]

function blocksOf(message: Message): Block[] {
  return message.blocks ?? []
}

function buttonsOf(message: Message) {
  return blocksOf(message).flatMap(block => (block.type === 'buttons' ? block.buttons : []))
}

function buttonData(message: Message): string[] {
  return buttonsOf(message).map(button => ('callback_data' in button ? button.callback_data : ''))
}

// Flattens a rich text (string, array or styled node) to its plain characters
function plain(text: unknown): string {
  if (typeof text === 'string') return text
  if (Array.isArray(text)) return text.map(plain).join('')
  if (text && typeof text === 'object' && 'text' in text) return plain(text.text)
  return ''
}

function messageText(message: Message): string {
  return blocksOf(message)
    .flatMap(block => (block.type === 'paragraph' ? [plain(block.text)] : []))
    .join('\n')
}

describe('demo Pauper callbacks', () => {
  it('round-trips every action', () => {
    const callbacks: DemoPauperCallback[] = [
      { action: 'open', outcomeIndex: null },
      { action: 'open', outcomeIndex: 2 },
      { action: 'summary', outcomeIndex: 0 },
      { action: 'send', outcomeIndex: MATCH_OUTCOMES.length - 1 },
      { action: 'dispute', outcomeIndex: 1 }
    ]
    for (const callback of callbacks) {
      expect(decodeDemoPauperCallback(encodeDemoPauperCallback(callback))).toEqual(callback)
    }
  })

  it.each([
    ['another prefix', 'mropen:abc'],
    ['an unknown action', 'demop:erase:1'],
    ['a summary without a score', 'demop:summary'],
    ['a send without a score', 'demop:send'],
    ['a score out of range', `demop:summary:${MATCH_OUTCOMES.length}`],
    ['a score that is not a number', 'demop:send:x'],
    ['a negative score', 'demop:summary:-1'],
    ['an extra part', 'demop:send:1:2']
  ])('rejects %s', (_label, data) => {
    expect(decodeDemoPauperCallback(data)).toBeNull()
  })

  it('stays under Telegram\'s 64 byte callback_data limit', () => {
    const data = encodeDemoPauperCallback({ action: 'summary', outcomeIndex: MATCH_OUTCOMES.length - 1 })
    expect(new TextEncoder().encode(data).length).toBeLessThanOrEqual(64)
  })
})

describe('demo Pauper messages', () => {
  it('opens on a table with the made-up opponent and one button to enter the result', () => {
    const message = demoPauperTableMessage()
    expect(messageText(message)).toContain('Giochi contro: Aurelio Varchetta')
    expect(buttonData(message)).toEqual(['demop:open'])
    expect(messageText(message)).toContain('nessuna scrittura reale')
  })

  it('offers every score, each leading to its summary', () => {
    const data = buttonData(demoPauperPickMessage(null))
    expect(data).toEqual(MATCH_OUTCOMES.map((_outcome, index) => `demop:summary:${index}`))
  })

  it('marks the score picked when reopened through "Modifica"', () => {
    const texts = buttonsOf(demoPauperPickMessage(1)).map(button => plain(button.text))
    expect(texts.filter(text => text.startsWith('⭐'))).toHaveLength(1)
    expect(texts[1]).toContain(MATCH_OUTCOMES[1]?.label ?? 'missing')
  })

  it('summarizes the score with send and edit buttons that keep it', () => {
    const message = demoPauperStepMessage({ action: 'summary', outcomeIndex: 3 })
    expect(buttonData(message)).toEqual(['demop:send:3', 'demop:open:3'])
  })

  it('confirms the registration of the score without writing anything', () => {
    const text = messageText(demoPauperStepMessage({ action: 'send', outcomeIndex: 1 }))
    expect(text).toContain(`Risultato registrato: ${MATCH_OUTCOMES[1]?.label}`)
    expect(text).toContain('nessuna scrittura reale')
  })

  it('lets the tester dispute the result as the opponent, keeping the score', () => {
    const message = demoPauperStepMessage({ action: 'send', outcomeIndex: 2 })
    expect(buttonData(message)).toEqual(['demop:dispute:2'])
    expect(plain(buttonsOf(message)[0]?.text)).toContain('Contesta come Aurelio Varchetta')
  })

  it('shows the dispute to the opponent and what the other player would be told', () => {
    const text = messageText(demoPauperStepMessage({ action: 'dispute', outcomeIndex: 1 }))
    expect(text).toContain(`Risultato contestato (${MATCH_OUTCOMES[1]?.label})`)
    expect(text).toContain('Aurelio Varchetta ha contestato il risultato del Round 2')
    expect(text).toContain('nessuna scrittura reale')
  })

  it('goes back to the score choice from "open"', () => {
    const message = demoPauperStepMessage({ action: 'open', outcomeIndex: null })
    expect(buttonData(message)).toHaveLength(MATCH_OUTCOMES.length)
  })
})
