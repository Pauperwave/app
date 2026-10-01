// test\unit\utils\associates\telegramLinkState.test.ts
import { describe, expect, it } from 'vitest'
import { TELEGRAM_LINK_STATE_CONFIG, getTelegramLinkState } from '~/utils/associates/telegramLinkState'

const usernames = new Map<string, string | null>([
  ['with-username', 'mario'],
  ['without-username', null]
])

describe('getTelegramLinkState', () => {
  it('is linkedWithUsername when the bot link has a nickname', () => {
    expect(getTelegramLinkState({ uuid: 'with-username', has_no_telegram: false }, usernames)).toBe('linkedWithUsername')
  })

  it('is linkedWithoutUsername when the bot link has no nickname', () => {
    expect(getTelegramLinkState({ uuid: 'without-username', has_no_telegram: false }, usernames)).toBe('linkedWithoutUsername')
  })

  it('is notLinked when there is no bot link', () => {
    expect(getTelegramLinkState({ uuid: 'other', has_no_telegram: false }, usernames)).toBe('notLinked')
  })

  it('is notLinked while the usernames map is not loaded', () => {
    expect(getTelegramLinkState({ uuid: 'with-username', has_no_telegram: false }, undefined)).toBe('notLinked')
  })

  it('is noTelegram when flagged, even if a bot link exists', () => {
    expect(getTelegramLinkState({ uuid: 'with-username', has_no_telegram: true }, usernames)).toBe('noTelegram')
  })
})

describe('TELEGRAM_LINK_STATE_CONFIG', () => {
  it('ranks states from most to least information', () => {
    const ranks = [
      TELEGRAM_LINK_STATE_CONFIG.linkedWithUsername.rank,
      TELEGRAM_LINK_STATE_CONFIG.linkedWithoutUsername.rank,
      TELEGRAM_LINK_STATE_CONFIG.notLinked.rank,
      TELEGRAM_LINK_STATE_CONFIG.noTelegram.rank
    ]
    expect(ranks).toEqual([0, 1, 2, 3])
  })
})
