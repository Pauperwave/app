// test\unit\server\telegram\crediti.test.ts
import { describe, expect, it } from 'vitest'
import { buildCreditsMessage } from '../../../../server/utils/telegram/commands/crediti'

type Message = ReturnType<typeof buildCreditsMessage>
type Block = NonNullable<Message['blocks']>[number]

// Flattens a rich text (string, array or styled node) to its plain characters
function plain(text: unknown): string {
  if (typeof text === 'string') return text
  if (Array.isArray(text)) return text.map(plain).join('')
  if (text && typeof text === 'object' && 'text' in text) return plain(text.text)
  return ''
}

function blocksOf(message: Message): Block[] {
  return message.blocks ?? []
}

function textOf(blocks: Block[]): string {
  return blocks
    .flatMap(block => (block.type === 'heading' || block.type === 'paragraph' ? [plain(block.text)] : []))
    .join('\n')
}

// The plain text of each bullet of the list
function bulletsOf(message: Message): string[] {
  const list = blocksOf(message).find(block => block.type === 'list')
  return list?.type === 'list' ? list.items.map(item => textOf(item.blocks)) : []
}

// Every url of a link anywhere in the message, in order
function linksOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(linksOf)
  if (!value || typeof value !== 'object') return []

  const node = value as Record<string, unknown>
  return [
    ...(node.type === 'url' && typeof node.url === 'string' ? [node.url] : []),
    ...Object.values(node).flatMap(linksOf)
  ]
}

describe('buildCreditsMessage', () => {
  const message = buildCreditsMessage('https://app.pauperwave.org')

  it('names the author with their Telegram username', () => {
    expect(textOf(blocksOf(message))).toContain('Emanuele Nardi (@emanuelenardi)')
  })

  it('lists where the data comes from, one bullet each', () => {
    expect(bulletsOf(message)).toEqual([
      'Carte e immagini vengono da Scryfall',
      'Prezzi da CardMarket e CardTrader'
    ])
  })

  it('links the three platforms', () => {
    expect(linksOf(message)).toEqual([
      'https://scryfall.com',
      'https://www.cardmarket.com',
      'https://www.cardtrader.com'
    ])
  })

  it('points to the association\'s site', () => {
    expect(textOf(blocksOf(message))).toContain('https://app.pauperwave.org')
  })
})
