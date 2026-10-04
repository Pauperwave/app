// test\unit\server\telegram\dona.test.ts
import { describe, expect, it } from 'vitest'
import { buildDonationMessage } from '../../../../server/utils/telegram/commands/dona'

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

describe('buildDonationMessage', () => {
  const message = buildDonationMessage()

  it('links the PayPal page', () => {
    expect(linksOf(message)).toEqual(['https://paypal.me/emanuelenardi'])
  })

  it('names the author with their Telegram username', () => {
    expect(JSON.stringify(message)).toContain('Emanuele Nardi (@emanuelenardi)')
  })
})
