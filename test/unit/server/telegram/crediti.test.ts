// test\unit\server\telegram\crediti.test.ts
import { describe, expect, it } from 'vitest'
import { buildCreditsMessage } from '../../../../server/utils/telegram/commands/crediti'

type Message = ReturnType<typeof buildCreditsMessage>

function textOf(message: Message): string {
  return (message.blocks ?? [])
    .flatMap(block => (block.type === 'heading' || block.type === 'paragraph' ? [String(block.text)] : []))
    .join('\n')
}

describe('buildCreditsMessage', () => {
  const text = textOf(buildCreditsMessage('https://app.pauperwave.org'))

  it('names the author with their Telegram username', () => {
    expect(text).toContain('Emanuele Nardi (@emanuelenardi)')
  })

  it('names where the cards and prices come from', () => {
    expect(text).toContain('Scryfall')
    expect(text).toContain('CardMarket')
    expect(text).toContain('CardTrader')
  })

  it('points to the association\'s site', () => {
    expect(text).toContain('https://app.pauperwave.org')
  })
})
