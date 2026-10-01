// test\unit\server\tournaments\commanderRound.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearCommanderDeck, recordKill, setPairingNoKills
} from '../../../../server/utils/tournaments/commanderRound'
import {
  createFakeSupabase, fakeCreateError, opsNamed, type RecordedCall
} from '../fakeSupabase'

beforeEach(() => {
  vi.stubGlobal('createError', fakeCreateError)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Answers the "how many kills does this pairing have" count query, everything else succeeds.
function withKillCount(count: number) {
  return (call: RecordedCall) => (call.table === 'tournament_kills'
    && opsNamed(call, 'select').length > 0
    ? { count, error: null }
    : { error: null })
}

const pairingUpdates = (calls: RecordedCall[]) =>
  calls.filter(call => call.table === 'tournament_pairings')

describe('setPairingNoKills', () => {
  it('confirms a table without kills', async () => {
    const { client, calls } = createFakeSupabase(withKillCount(0))

    await setPairingNoKills(client as never, { pairingUuid: 'pair-1', noKills: true })

    const [update] = pairingUpdates(calls)
    expect(opsNamed(update, 'update')).toEqual([[{ no_kills: true }]])
    expect(opsNamed(update, 'eq')).toEqual([['uuid', 'pair-1']])
  })

  it('refuses to confirm a table that already has kills recorded', async () => {
    const { client, calls } = createFakeSupabase(withKillCount(2))

    await expect(setPairingNoKills(client as never, { pairingUuid: 'pair-1', noKills: true }))
      .rejects.toMatchObject({ statusCode: 409 })
    expect(pairingUpdates(calls)).toHaveLength(0)
  })

  it('retracts the confirmation without looking at the kills', async () => {
    const { client, calls } = createFakeSupabase()

    await setPairingNoKills(client as never, { pairingUuid: 'pair-1', noKills: false })

    expect(calls.some(call => call.table === 'tournament_kills')).toBe(false)
    expect(opsNamed(pairingUpdates(calls)[0], 'update')).toEqual([[{ no_kills: false }]])
  })

  it('fails with a 500 when the kills cannot be counted', async () => {
    const { client } = createFakeSupabase(call => (call.table === 'tournament_kills'
      ? { error: { message: 'count failed' } }
      : { error: null }))

    await expect(setPairingNoKills(client as never, { pairingUuid: 'pair-1', noKills: true }))
      .rejects.toMatchObject({ statusCode: 500, statusMessage: 'count failed' })
  })
})

describe('recordKill', () => {
  it('records the kill and clears any "no kills" confirmation of that table', async () => {
    const { client, calls } = createFakeSupabase()

    await recordKill(client as never, {
      tournamentUuid: 't-1', pairingUuid: 'pair-1', killerUuid: 'a', killedPlayerUuid: 'b'
    })

    const [insert] = calls.filter(call => call.table === 'tournament_kills')
    expect(opsNamed(insert, 'insert')).toEqual([[{
      tournament_uuid: 't-1', pairing_uuid: 'pair-1', killer_uuid: 'a', killed_player_uuid: 'b'
    }]])
    expect(opsNamed(pairingUpdates(calls)[0], 'update')).toEqual([[{ no_kills: false }]])
  })

  it('does not touch the table when the kill could not be saved', async () => {
    const { client, calls } = createFakeSupabase(call => (call.table === 'tournament_kills'
      ? { error: { message: 'insert failed' } }
      : { error: null }))

    await expect(recordKill(client as never, {
      tournamentUuid: 't-1', pairingUuid: 'pair-1', killerUuid: 'a', killedPlayerUuid: 'b'
    })).rejects.toMatchObject({ statusCode: 500 })
    expect(pairingUpdates(calls)).toHaveLength(0)
  })
})

describe('clearCommanderDeck', () => {
  it('unlinks the deck from that player\'s result only, keeping the rest of the row', async () => {
    const { client, calls } = createFakeSupabase()

    await clearCommanderDeck(client as never, { pairingUuid: 'pair-1', playerUuid: 'p-1' })

    expect(calls[0]?.table).toBe('tournament_round_results')
    expect(opsNamed(calls[0], 'update')).toEqual([[{ commander_deck_uuid: null }]])
    expect(opsNamed(calls[0], 'eq')).toEqual([
      ['pairing_uuid', 'pair-1'],
      ['player_uuid', 'p-1']
    ])
    expect(opsNamed(calls[0], 'delete')).toHaveLength(0)
  })
})
