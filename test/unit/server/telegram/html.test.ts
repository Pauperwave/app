// test\unit\server\telegram\html.test.ts
import { describe, expect, it } from 'vitest'
import { escapeHtml } from '../../../../server/utils/telegram/html'

describe('escapeHtml', () => {
  it('escapes the three characters Telegram reads as markup', () => {
    expect(escapeHtml('a<b>&c')).toBe('a&lt;b&gt;&amp;c')
  })

  it('escapes an ampersand once, not again inside what it produced', () => {
    expect(escapeHtml('<')).toBe('&lt;')
  })

  it('leaves plain text alone', () => {
    expect(escapeHtml('feat(deploy): tell the admins')).toBe('feat(deploy): tell the admins')
  })
})
