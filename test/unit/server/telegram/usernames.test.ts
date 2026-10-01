// test\unit\server\telegram\usernames.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchTelegramUsernames } from '../../../../server/utils/telegram/usernames'
import { createFakeSupabase, opsNamed, type RecordedCall } from '../fakeSupabase'

interface Link {
  associate_uuid: string
  chat_id: number
  telegram_username: string | null
}

const getChat = vi.fn()

function setUp(links: Link[], selectError: { message: string } | null = null) {
  const respond = (call: RecordedCall) => (opsNamed(call, 'select').length > 0
    ? { data: links, error: selectError }
    : { error: null })
  const fake = createFakeSupabase(respond)
  vi.stubGlobal('telegramServiceSupabaseClient', () => fake.client)
  vi.stubGlobal('useTelegramBot', () => ({ api: { getChat } }))
  return fake
}

// What got written back to the links: [username saved, associate it was saved for].
function savedUsernames(calls: RecordedCall[]) {
  return calls
    .filter(call => opsNamed(call, 'update').length > 0)
    .map((call) => {
      const saved = opsNamed(call, 'update')[0]?.[0] as { telegram_username: string | null }
      return [saved.telegram_username, opsNamed(call, 'eq')[0]?.[1]]
    })
}

beforeEach(() => {
  getChat.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('fetchTelegramUsernames', () => {
  it('answers with the username Telegram reports for each linked associate', async () => {
    setUp([
      { associate_uuid: 'a-1', chat_id: 101, telegram_username: 'anna' },
      { associate_uuid: 'a-2', chat_id: 102, telegram_username: 'bruno' }
    ])
    getChat.mockImplementation(async (chatId: number) =>
      ({ username: chatId === 101 ? 'anna' : 'bruno' }))

    const usernames = await fetchTelegramUsernames(['a-1', 'a-2'])

    expect(usernames).toEqual(new Map([['a-1', 'anna'], ['a-2', 'bruno']]))
  })

  it('saves only the usernames that changed, including one that was removed', async () => {
    const { calls } = setUp([
      { associate_uuid: 'a-same', chat_id: 1, telegram_username: 'same' },
      { associate_uuid: 'a-new', chat_id: 2, telegram_username: null },
      { associate_uuid: 'a-renamed', chat_id: 3, telegram_username: 'old' },
      { associate_uuid: 'a-removed', chat_id: 4, telegram_username: 'gone' }
    ])
    const usernameByChat: Record<number, string | undefined> = {
      1: 'same', 2: 'fresh', 3: 'newer', 4: undefined
    }
    getChat.mockImplementation(async (chatId: number) => ({ username: usernameByChat[chatId] }))

    await fetchTelegramUsernames(['a-same', 'a-new', 'a-renamed', 'a-removed'])

    expect(savedUsernames(calls)).toEqual([
      ['fresh', 'a-new'],
      ['newer', 'a-renamed'],
      [null, 'a-removed']
    ])
  })

  it('leaves out whoever Telegram cannot be asked about, and keeps their saved username', async () => {
    const { calls } = setUp([
      { associate_uuid: 'a-ok', chat_id: 1, telegram_username: null },
      { associate_uuid: 'a-blocked', chat_id: 2, telegram_username: 'kept' }
    ])
    getChat.mockImplementation(async (chatId: number) => {
      if (chatId === 2) throw new Error('chat not found')
      return { username: 'ok' }
    })

    const usernames = await fetchTelegramUsernames(['a-ok', 'a-blocked'])

    expect(usernames).toEqual(new Map([['a-ok', 'ok']]))
    expect(savedUsernames(calls)).toEqual([['ok', 'a-ok']])
  })

  it('asks about each associate once even when listed twice', async () => {
    setUp([{ associate_uuid: 'a-1', chat_id: 1, telegram_username: 'anna' }])
    getChat.mockResolvedValue({ username: 'anna' })

    await fetchTelegramUsernames(['a-1', 'a-1', 'a-1'])

    expect(getChat).toHaveBeenCalledTimes(1)
  })

  it('does nothing for an empty list', async () => {
    const { calls } = setUp([])

    expect(await fetchTelegramUsernames([])).toEqual(new Map())
    expect(calls).toHaveLength(0)
    expect(getChat).not.toHaveBeenCalled()
  })

  it('answers empty, without asking Telegram, when the links cannot be read', async () => {
    setUp([], { message: 'db down' })

    expect(await fetchTelegramUsernames(['a-1'])).toEqual(new Map())
    expect(getChat).not.toHaveBeenCalled()
  })
})
