// test\unit\server\tournaments\deckAccess.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  requireAdminOrDeckOwner,
  requireAdminOrOwnPlayer
} from '../../../../server/utils/tournaments/deckAccess'
import { fakeCreateError } from '../fakeSupabase'

const requireUser = vi.fn()
const hasAdminPermission = vi.fn()

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ sub: 'user-1' })
  hasAdminPermission.mockReset().mockResolvedValue(false)

  vi.stubGlobal('createError', fakeCreateError)
  vi.stubGlobal('requireUser', requireUser)
  vi.stubGlobal('hasAdminPermission', hasAdminPermission)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// A client answering .from(table).select().eq().maybeSingle() with a row per table
function clientWith(rows: Record<string, unknown>) {
  return {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: rows[table] ?? null, error: null })
      }
      return chain
    }
  } as never
}

const event = {} as never

describe('requireAdminOrOwnPlayer', () => {
  it('lets an admin through without looking at the player', async () => {
    hasAdminPermission.mockResolvedValue(true)

    await expect(requireAdminOrOwnPlayer(event, clientWith({}), 'player-9')).resolves.toBeDefined()
  })

  it('lets a player act on their own player\'s decks', async () => {
    const client = clientWith({ players: { uuid: 'player-1' } })

    await expect(requireAdminOrOwnPlayer(event, client, 'player-1')).resolves.toBeDefined()
  })

  it('refuses a player acting on someone else\'s decks', async () => {
    const client = clientWith({ players: { uuid: 'player-1' } })

    await expect(requireAdminOrOwnPlayer(event, client, 'player-2'))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('refuses a user who is not a player at all', async () => {
    await expect(requireAdminOrOwnPlayer(event, clientWith({}), 'player-1'))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('requireAdminOrDeckOwner', () => {
  it('answers 404 for a deck that does not exist', async () => {
    await expect(requireAdminOrDeckOwner(event, clientWith({}), 'deck-1'))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('lets a player act on a deck that belongs to them', async () => {
    const client = clientWith({
      commander_decks: { player_uuid: 'player-1' },
      players: { uuid: 'player-1' }
    })

    await expect(requireAdminOrDeckOwner(event, client, 'deck-1')).resolves.toBeDefined()
  })

  it('refuses a player acting on someone else\'s deck', async () => {
    const client = clientWith({
      commander_decks: { player_uuid: 'player-2' },
      players: { uuid: 'player-1' }
    })

    await expect(requireAdminOrDeckOwner(event, client, 'deck-1'))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})
