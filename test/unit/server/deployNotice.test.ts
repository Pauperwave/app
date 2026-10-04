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
  url: 'https://app-abc123.vercel.app',
  ref: 'main',
  sha: 'fa1eade47b73733d6312d5abfad33ce9e4068081',
  message: 'Update about page'
}

describe('parseDeployNotice', () => {
  it('reads a complete notice', () => {
    expect(parseDeployNotice(VALID)).toEqual(VALID)
  })

  it('keeps only the first line of a commit message', () => {
    const notice = parseDeployNotice({ ...VALID, message: 'Fix a thing\n\nLong explanation' })
    expect(notice?.message).toBe('Fix a thing')
  })

  it('treats the commit details as optional', () => {
    const notice = parseDeployNotice({ environment: 'production', url: VALID.url })
    expect(notice).toEqual({
      environment: 'production', url: VALID.url, ref: null, sha: null, message: null
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
    ['no environment', { url: VALID.url }],
    ['no url', { environment: 'production' }],
    ['a url that is not https', { environment: 'production', url: 'http://app.vercel.app' }],
    ['an environment that is not text', { environment: 1, url: VALID.url }]
  ])('rejects %s', (_label, body) => {
    expect(parseDeployNotice(body)).toBeNull()
  })
})

describe('isProductionDeploy', () => {
  it('only accepts production, whatever its case', () => {
    const notice = parseDeployNotice(VALID)
    expect(notice && isProductionDeploy(notice)).toBe(true)
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
  it('says what was deployed, from which commit, and where', () => {
    const notice = parseDeployNotice(VALID)
    expect(notice && buildDeployNoticeText(notice)).toBe(
      '🚀 Deploy in produzione completato\nmain · fa1eade\nUpdate about page\nhttps://app-abc123.vercel.app'
    )
  })

  it('leaves out the commit lines that are missing', () => {
    const text = buildDeployNoticeText({
      environment: 'production', url: VALID.url, ref: null, sha: null, message: null
    })
    expect(text).toBe(`🚀 Deploy in produzione completato\n${VALID.url}`)
  })

  it('shows just the branch when there is no commit hash', () => {
    const text = buildDeployNoticeText({
      environment: 'production', url: VALID.url, ref: 'main', sha: null, message: null
    })
    expect(text.split('\n')[1]).toBe('main')
  })
})
