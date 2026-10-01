// test\unit\server\tournaments\tournamentDrops.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setPlayerDropped } from '../../../../server/utils/tournaments/tournamentDrops'
import { createFakeSupabase, fakeCreateError, opsNamed } from '../fakeSupabase'

const input = { tournamentUuid: 't-1', playerUuid: 'p-1', roundUuid: 'r-1' }

beforeEach(() => {
  vi.stubGlobal('createError', fakeCreateError)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('setPlayerDropped', () => {
  it('records a drop with the round it was made in, ignoring a drop already recorded', async () => {
    const { client, calls } = createFakeSupabase()

    await setPlayerDropped(client as never, { ...input, dropped: true })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.table).toBe('tournament_player_drops')
    expect(opsNamed(calls[0], 'upsert')).toEqual([[
      { tournament_uuid: 't-1', player_uuid: 'p-1', round_uuid: 'r-1' },
      { onConflict: 'tournament_uuid,player_uuid', ignoreDuplicates: true }
    ]])
  })

  it('undoes a drop by deleting that player\'s row for the tournament', async () => {
    const { client, calls } = createFakeSupabase()

    await setPlayerDropped(client as never, { ...input, dropped: false })

    expect(opsNamed(calls[0], 'delete')).toHaveLength(1)
    expect(opsNamed(calls[0], 'eq')).toEqual([
      ['tournament_uuid', 't-1'],
      ['player_uuid', 'p-1']
    ])
  })

  it('fails with a 500 carrying the database message', async () => {
    const { client } = createFakeSupabase(() => ({ error: { message: 'boom' } }))

    await expect(setPlayerDropped(client as never, { ...input, dropped: true }))
      .rejects.toMatchObject({ statusCode: 500, statusMessage: 'boom' })
  })
})
