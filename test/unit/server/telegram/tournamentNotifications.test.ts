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
}

function seatingRow(telegramNotificationsEnabled: boolean) {
  return {
    table_number: 1,
    player1_uuid: 'p1',
    player2_uuid: 'p2',
    player3_uuid: null,
    player4_uuid: null,
    round: { round_number: 2 },
    tournament: { name: 'Pauper Night', telegram_notifications_enabled: telegramNotificationsEnabled }
  }
}

const players = [
  { uuid: 'p1', associate_uuid: 'a1', associate: { first_name: 'Anna', last_name: 'Rossi' } },
  { uuid: 'p2', associate_uuid: 'a2', associate: { first_name: 'Bruno', last_name: 'Verdi' } }
]

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
