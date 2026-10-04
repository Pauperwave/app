// test\unit\server\telegram\inlineHints.test.ts
import { describe, expect, it } from 'vitest'
import { buildInlineHints } from '../../../../server/utils/telegram/commands/inlineHints'

function messageOf(hint: ReturnType<typeof buildInlineHints>[number] | undefined): string {
  const content = hint?.input_message_content
  return content && 'message_text' in content ? content.message_text : ''
}

describe('buildInlineHints', () => {
  const hints = buildInlineHints('pauperwavebot')

  it('explains the price search and the commander search, one row each', () => {
    expect(hints.map(hint => hint.id)).toEqual(['hint-price', 'hint-commander'])
    expect(hints[0]?.title).toContain('€ nome carta')
    expect(hints[1]?.title).toContain('# nome comandante')
  })

  it('names the bot and the prefix in what a row posts', () => {
    expect(messageOf(hints[0])).toBe('Per cercare il prezzo di una carta scrivi @pauperwavebot € nome carta')
    expect(messageOf(hints[1])).toBe('Per cercare un comandante scrivi @pauperwavebot # nome comandante')
  })
})
