// test\unit\server\deployNotice.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildDeployNoticeText,
  isDeployNoticeSecretValid,
  isProductionDeploy,
  parseDeployNotice
} from '../../../server/utils/deployNotice'

const VALID = {
  environment: 'production',
  ref: 'main',
  sha: 'fa1eade47b73733d6312d5abfad33ce9e4068081',
  message: 'Update about page'
}

describe('parseDeployNotice', () => {
  it('reads a complete notice', () => {
    expect(parseDeployNotice(VALID)).toEqual(VALID)
  })

  it('ignores fields it does not know, like the deployment url an older workflow sent', () => {
    expect(parseDeployNotice({ ...VALID, url: 'https://app-abc123.vercel.app' })).toEqual(VALID)
  })

  it('keeps only the first line of a commit message', () => {
    const notice = parseDeployNotice({ ...VALID, message: 'Fix a thing\n\nLong explanation' })
    expect(notice?.message).toBe('Fix a thing')
  })

  it('treats the commit details as optional', () => {
    expect(parseDeployNotice({ environment: 'production' })).toEqual({
      environment: 'production', ref: null, sha: null, message: null
    })
  })

  it('turns blank optional fields into nothing', () => {
    const notice = parseDeployNotice({ ...VALID, ref: '  ', message: '' })
    expect(notice?.ref).toBeNull()
    expect(notice?.message).toBeNull()
  })

  it('cuts a field that is too long', () => {
    const notice = parseDeployNotice({ ...VALID, message: 'x'.repeat(1000) })
    expect(notice?.message).toHaveLength(300)
  })

  it.each([
    ['nothing', undefined],
    ['a string', 'production'],
    ['an empty object', {}],
    ['a blank environment', { environment: '  ' }],
    ['an environment that is not text', { environment: 1 }]
  ])('rejects %s', (_label, body) => {
    expect(parseDeployNotice(body)).toBeNull()
  })
})

describe('isProductionDeploy', () => {
  it('only accepts production, whatever its case', () => {
    expect(isProductionDeploy(VALID)).toBe(true)
    expect(isProductionDeploy({ ...VALID, environment: 'Production' })).toBe(true)
    expect(isProductionDeploy({ ...VALID, environment: 'preview' })).toBe(false)
  })
})

describe('isDeployNoticeSecretValid', () => {
  it('accepts the same secret', () => {
    expect(isDeployNoticeSecretValid('s3cret', 's3cret')).toBe(true)
  })

  it('rejects another secret, also one of a different length', () => {
    expect(isDeployNoticeSecretValid('s3cret!', 's3cret')).toBe(false)
    expect(isDeployNoticeSecretValid('x', 's3cret')).toBe(false)
  })

  it('rejects everything when no secret is configured', () => {
    expect(isDeployNoticeSecretValid('', '')).toBe(false)
    expect(isDeployNoticeSecretValid('anything', undefined)).toBe(false)
    expect(isDeployNoticeSecretValid(undefined, 's3cret')).toBe(false)
  })
})

describe('buildDeployNoticeText', () => {
  it('puts the branch and short hash as inline code, then the commit message, after a blank line', () => {
    expect(buildDeployNoticeText(VALID)).toBe(
      '🚀 Deploy in produzione completato\n\n<code>main · fa1eade</code>\nUpdate about page'
    )
  })

  it('has no link to the deployment', () => {
    expect(buildDeployNoticeText(VALID)).not.toContain('http')
  })

  it('escapes what Telegram would read as HTML in the commit message', () => {
    const text = buildDeployNoticeText({ ...VALID, message: 'fix <b> & more' })
    expect(text).toContain('fix &lt;b&gt; &amp; more')
  })

  it('leaves out the commit lines that are missing', () => {
    const text = buildDeployNoticeText({ ...VALID, ref: null, sha: null })
    expect(text).toBe('🚀 Deploy in produzione completato\n\nUpdate about page')
  })

  it('shows just the branch when there is no commit hash', () => {
    const text = buildDeployNoticeText({ ...VALID, sha: null, message: null })
    expect(text).toBe('🚀 Deploy in produzione completato\n\n<code>main</code>')
  })

  it('escapes the branch name too', () => {
    const text = buildDeployNoticeText({ ...VALID, ref: 'feat/<x>', sha: null, message: null })
    expect(text).toContain('<code>feat/&lt;x&gt;</code>')
  })

  it('is only the heading when nothing is known about the commit', () => {
    const text = buildDeployNoticeText({ environment: 'production', ref: null, sha: null, message: null })
    expect(text).toBe('🚀 Deploy in produzione completato')
  })
})
