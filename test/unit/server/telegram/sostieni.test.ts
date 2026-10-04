// test\unit\server\telegram\sostieni.test.ts
import { describe, expect, it } from 'vitest'
import { buildSupportMessage } from '../../../../server/utils/telegram/commands/sostieni'

type Block = NonNullable<ReturnType<typeof buildSupportMessage>['blocks']>[number]

function buttonsOf(blocks: Block[]) {
  return blocks.flatMap(block => (block.type === 'buttons' ? block.buttons : []))
}

describe('buildSupportMessage', () => {
  const message = buildSupportMessage()
  const buttons = buttonsOf(message.blocks ?? [])

  it('has the PayPal page on the left and the support flow on the right', () => {
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toMatchObject({ url: 'https://paypal.me/emanuelenardi' })
    expect(buttons[1]).toMatchObject({ callback_data: 'helpbtn:supporto' })
  })

  it('names the author with their Telegram username', () => {
    expect(JSON.stringify(message)).toContain('Emanuele Nardi (@emanuelenardi)')
  })
})
