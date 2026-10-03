// test\unit\server\telegram\webAppAuth.test.ts
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyWebAppInitData } from '../../../../server/utils/telegram/webAppAuth'

const BOT_TOKEN = '123456:TEST-token'
const NOW_MS = 1_800_000_000_000
const FRESH_AUTH_DATE = String(NOW_MS / 1000 - 60)

// Signs the way Telegram documents it, written out here independently of the code under test
function signedInitData(fields: Record<string, string>, token = BOT_TOKEN): string {
  const dataCheckString = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(token).digest()
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex')

  return new URLSearchParams({ ...fields, hash }).toString()
}

const baseFields = {
  auth_date: FRESH_AUTH_DATE,
  query_id: 'AAH-test',
  user: JSON.stringify({ id: 4242, first_name: 'Anna' })
}

describe('verifyWebAppInitData', () => {
  it('returns the user of correctly signed data', () => {
    const user = verifyWebAppInitData(signedInitData(baseFields), BOT_TOKEN, NOW_MS)
    expect(user).toEqual({ id: 4242 })
  })

  it('refuses data signed with another bot token', () => {
    const forged = signedInitData(baseFields, '999:OTHER')
    expect(verifyWebAppInitData(forged, BOT_TOKEN, NOW_MS)).toBeNull()
  })

  it('refuses data whose content was changed after signing', () => {
    const params = new URLSearchParams(signedInitData(baseFields))
    params.set('user', JSON.stringify({ id: 1 }))
    expect(verifyWebAppInitData(params.toString(), BOT_TOKEN, NOW_MS)).toBeNull()
  })

  it('refuses data that is too old', () => {
    const stale = signedInitData({ ...baseFields, auth_date: String(NOW_MS / 1000 - 3 * 86400) })
    expect(verifyWebAppInitData(stale, BOT_TOKEN, NOW_MS)).toBeNull()
  })

  it('refuses a missing or malformed hash, and empty input', () => {
    expect(verifyWebAppInitData('', BOT_TOKEN, NOW_MS)).toBeNull()
    const unsigned = new URLSearchParams(baseFields).toString()
    expect(verifyWebAppInitData(unsigned, BOT_TOKEN, NOW_MS)).toBeNull()
    expect(verifyWebAppInitData('hash=zz&auth_date=1', BOT_TOKEN, NOW_MS)).toBeNull()
    expect(verifyWebAppInitData(signedInitData(baseFields), '', NOW_MS)).toBeNull()
  })

  it('refuses signed data without a usable user', () => {
    const noUser = signedInitData({ auth_date: FRESH_AUTH_DATE })
    const badUser = signedInitData({ auth_date: FRESH_AUTH_DATE, user: 'not json' })
    expect(verifyWebAppInitData(noUser, BOT_TOKEN, NOW_MS)).toBeNull()
    expect(verifyWebAppInitData(badUser, BOT_TOKEN, NOW_MS)).toBeNull()
  })
})
