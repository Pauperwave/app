// app\utils\associates\telegramLinkState.ts
import type { Associate } from '~/types'
import { ICONS } from '~/utils/icons'

export type TelegramLinkState = 'linkedWithUsername' | 'linkedWithoutUsername' | 'notLinked' | 'noTelegram'

// Most information first: sorting ascending lists linked-with-nickname before everyone else.
export const TELEGRAM_LINK_STATE_CONFIG: Record<TelegramLinkState, { rank: number, icon: string, color: 'success' | 'warning' | 'neutral' | 'error' }> = {
  linkedWithUsername: { rank: 0, icon: ICONS.telegram, color: 'success' },
  linkedWithoutUsername: { rank: 1, icon: ICONS.telegram, color: 'warning' },
  notLinked: { rank: 2, icon: ICONS.telegram, color: 'neutral' },
  noTelegram: { rank: 3, icon: ICONS.noTelegram, color: 'error' }
}

// `usernames` is the bot-link map: a missing key means not linked, a null value linked without a nickname.
export function getTelegramLinkState(
  associate: Pick<Associate, 'uuid' | 'has_no_telegram'>,
  usernames: Map<string, string | null> | undefined
): TelegramLinkState {
  if (associate.has_no_telegram) return 'noTelegram'
  if (!usernames?.has(associate.uuid)) return 'notLinked'
  return usernames.get(associate.uuid) ? 'linkedWithUsername' : 'linkedWithoutUsername'
}
