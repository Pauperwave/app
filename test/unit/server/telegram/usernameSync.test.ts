// test\unit\server\telegram\usernameSync.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from 'grammy'
import { syncTelegramUsername } from '../../../../server/utils/telegram/usernameSync'
import { createFakeSupabase, opsNamed } from '../fakeSupabase'
import type { FakeResult } from '../fakeSupabase'

function setUp(result: FakeResult = { error: null }) {
  const fake = createFakeSupabase(() => result)
  vi.stubGlobal('telegramServiceSupabaseClient', () => fake.client)
  return fake
}

function makeContext(overrides: { chatType?: string, chatId?: number, username?: string }) {
  return {
    chat: { type: overrides.chatType ?? 'private', id: overrides.chatId ?? 42 },
    from: { username: overrides.username }
  } as unknown as Context
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('syncTelegramUsername', () => {
  it('saves the username for the sender chat, only where it differs', async () => {
    const { calls } = setUp()

    await syncTelegramUsername(makeContext({ username: 'nuovo_nick', chatId: 7 }), async () => {})

    const [call] = calls
    expect(call?.table).toBe('pauperwave_associate_telegram_links')
    expect(opsNamed(call, 'update')).toEqual([[{ telegram_username: 'nuovo_nick' }]])
    expect(opsNamed(call, 'eq')).toEqual([['chat_id', 7]])
    expect(opsNamed(call, 'or')).toEqual([
      ['telegram_username.is.null,telegram_username.neq.nuovo_nick']
    ])
  })

  it('clears the saved username when the sender has none, only if one is saved', async () => {
    const { calls } = setUp()

    await syncTelegramUsername(makeContext({ username: undefined }), async () => {})

    const [call] = calls
    expect(opsNamed(call, 'update')).toEqual([[{ telegram_username: null }]])
    expect(opsNamed(call, 'not')).toEqual([['telegram_username', 'is', null]])
  })

  it('does nothing outside a private chat', async () => {
    const { calls } = setUp()

    await syncTelegramUsername(makeContext({ chatType: 'group', username: 'nick_group' }), async () => {})

    expect(calls).toHaveLength(0)
  })

  it('ignores a username that is not letters, digits and underscores', async () => {
    const { calls } = setUp()

    await syncTelegramUsername(makeContext({ username: 'a),telegram_username.neq.(b' }), async () => {})

    expect(calls).toHaveLength(0)
  })

  it('always hands the update on, even when saving fails', async () => {
    setUp({ error: { message: 'boom' } })
    const next = vi.fn().mockResolvedValue(undefined)

    await syncTelegramUsername(makeContext({ username: 'nick_ok' }), next)

    expect(next).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalled()
  })
})
