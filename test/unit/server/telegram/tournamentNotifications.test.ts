// test\unit\server\telegram\tournamentNotifications.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  notifyRegistrationsAccepted, notifyRoundTables, prepareTablesCancelledMessages
} from '../../../../server/utils/telegram/tournamentNotifications'
import { notifyTelegramAssociates } from '../../../../server/utils/telegram/notify'
import { createFakeSupabase, type RecordedCall } from '../fakeSupabase'

vi.mock('../../../../server/utils/telegram/notify', () => ({
  notifyTelegramAssociates: vi.fn().mockResolvedValue({ sent: 1, notLinked: 0, failed: 0 })
}))

function setUp(tables: Record<string, unknown>) {
  const respond = (call: RecordedCall) => ({ data: tables[call.table] ?? [], error: null })
  const fake = createFakeSupabase(respond)
  vi.stubGlobal('telegramServiceSupabaseClient', () => fake.client)
  vi.stubGlobal('fetchTelegramUsernames', async () => new Map())
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://app.pauperwave.org' } }))
}

function seatingRow(telegramNotificationsEnabled: boolean, seats: (string | null)[] = ['p1', 'p2']) {
  return {
    uuid: 'pairing-1',
    table_number: 1,
    player1_uuid: seats[0] ?? null,
    player2_uuid: seats[1] ?? null,
    player3_uuid: seats[2] ?? null,
    player4_uuid: seats[3] ?? null,
    round: { round_number: 2 },
    tournament: { name: 'Pauper Night', telegram_notifications_enabled: telegramNotificationsEnabled }
  }
}

const players = [
  { uuid: 'p1', associate_uuid: 'a1', associate: { first_name: 'Anna', last_name: 'Rossi' } },
  { uuid: 'p2', associate_uuid: 'a2', associate: { first_name: 'Bruno', last_name: 'Verdi' } }
]

const thirdPlayer = {
  uuid: 'p3', associate_uuid: 'a3', associate: { first_name: 'Carla', last_name: 'Neri' }
}

// What notifyRoundTables handed to notifyTelegramAssociates
function sentMessages() {
  return vi.mocked(notifyTelegramAssociates).mock.calls[0]?.[0] ?? []
}

function registration(telegramNotificationsEnabled: boolean) {
  return {
    player: { associate_uuid: 'a1' },
    tournament: { name: 'Pauper Night', telegram_notifications_enabled: telegramNotificationsEnabled }
  }
}

beforeEach(() => {
  vi.mocked(notifyTelegramAssociates).mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('notifyRoundTables', () => {
  it('announces the tables when notifications are on', async () => {
    setUp({ tournament_pairings: [seatingRow(true)], players })

    const result = await notifyRoundTables('round-1')

    expect(result).toEqual({ sent: 1, notLinked: 0, failed: 0 })
    expect(vi.mocked(notifyTelegramAssociates).mock.calls[0]?.[0]).toHaveLength(2)
  })

  it('sends a 1v1 player the table card with the result and timer buttons', async () => {
    setUp({ tournament_pairings: [seatingRow(true)], players })

    await notifyRoundTables('round-1')

    const first = sentMessages().find(message => message.associateUuid === 'a1')
    expect(first && 'rich' in first).toBe(true)
    const buttons = first && 'rich' in first
      ? first.rich.blocks?.flatMap(block => (block.type === 'buttons' ? block.buttons : []))
      : []
    expect(buttons?.map(button => ('callback_data' in button ? button.callback_data : ''))).toContain('mropen:pairing-1')
    expect(buttons?.some(button => 'web_app' in button
      && button.web_app.url === 'https://app.pauperwave.org/telegram/turni')).toBe(true)
  })

  it('sends a pod player the seating as text, not a card', async () => {
    setUp({
      tournament_pairings: [seatingRow(true, ['p1', 'p2', 'p3'])],
      players: [...players, thirdPlayer]
    })

    await notifyRoundTables('round-1')

    const messages = sentMessages()
    expect(messages).toHaveLength(3)
    expect(messages.every(message => 'text' in message)).toBe(true)
  })

  it('tells nobody who sits alone at a table', async () => {
    setUp({ tournament_pairings: [seatingRow(true, ['p1', null])], players })

    await notifyRoundTables('round-1')

    expect(sentMessages()).toEqual([])
  })

  it('sends nothing and returns null when notifications are off', async () => {
    setUp({ tournament_pairings: [seatingRow(false)], players })

    const result = await notifyRoundTables('round-1')

    expect(result).toBeNull()
    expect(notifyTelegramAssociates).not.toHaveBeenCalled()
  })
})

describe('prepareTablesCancelledMessages', () => {
  it('prepares one message per player when notifications are on', async () => {
    setUp({ tournament_pairings: [seatingRow(true)], players })

    const messages = await prepareTablesCancelledMessages('tournament-1', 2)

    expect(messages.map(message => message.associateUuid).sort()).toEqual(['a1', 'a2'])
  })

  it('prepares nothing when notifications are off', async () => {
    setUp({ tournament_pairings: [seatingRow(false)], players })

    expect(await prepareTablesCancelledMessages('tournament-1', 2)).toEqual([])
  })
})

describe('notifyRegistrationsAccepted', () => {
  it('notifies accepted players when notifications are on', async () => {
    setUp({ tournament_registrations: [registration(true)] })

    await notifyRegistrationsAccepted(['reg-1'])

    expect(vi.mocked(notifyTelegramAssociates).mock.calls[0]?.[0]).toHaveLength(1)
  })

  it('notifies nobody when notifications are off', async () => {
    setUp({ tournament_registrations: [registration(false)] })

    await notifyRegistrationsAccepted(['reg-1'])

    expect(vi.mocked(notifyTelegramAssociates).mock.calls[0]?.[0]).toEqual([])
  })
})
