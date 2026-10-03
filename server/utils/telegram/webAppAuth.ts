// server\utils\telegram\webAppAuth.ts
import { createHmac, timingSafeEqual } from 'node:crypto'

// Validates the `initData` a Telegram Mini App sends, per
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app: the fields
// except `hash`, sorted and joined as "key=value" lines, must hash (HMAC-SHA256, key derived from
// the bot token) to the received `hash`. It proves the data came from Telegram, so the user id in
// it can be trusted.

// initData older than this is refused: Telegram suggests checking auth_date, and a leaked string
// shouldn't work forever. A Mini App stays open for a whole round, so the window is generous.
const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60

export interface WebAppUser {
  id: number
}

function signature(dataCheckString: string, botToken: string): Buffer {
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()

  return createHmac('sha256', secretKey).update(dataCheckString).digest()
}

// The Telegram user, or null when the data is missing, forged, expired or malformed
export function verifyWebAppInitData(
  initData: string,
  botToken: string,
  nowMs: number,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
): WebAppUser | null {
  if (!initData || !botToken) return null

  const params = new URLSearchParams(initData)
  const receivedHash = params.get('hash')
  if (!receivedHash || !/^[0-9a-f]{64}$/i.test(receivedHash)) return null

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')

  const expected = signature(dataCheckString, botToken)
  const received = Buffer.from(receivedHash, 'hex')
  if (!timingSafeEqual(expected, received)) return null

  const authDate = Number(params.get('auth_date'))
  if (!Number.isFinite(authDate) || nowMs / 1000 - authDate > maxAgeSeconds) return null

  try {
    const user = JSON.parse(params.get('user') ?? '') as { id?: unknown }
    return typeof user.id === 'number' ? { id: user.id } : null
  } catch {
    return null
  }
}
