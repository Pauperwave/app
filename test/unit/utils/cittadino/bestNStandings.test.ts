// test\unit\utils\cittadino\bestNStandings.test.ts
import { describe, expect, it } from 'vitest'
import { groupBestNByPlayer, toBestNPlacement, type PlacementRow } from '~/utils/cittadino/bestNStandings'

describe('toBestNPlacement', () => {
  it('maps a snake_case row to camelCase', () => {
    const row: PlacementRow = { player_uuid: 'p1', player_name: 'Alice', event_uuid: 'e1', rank: 2 }
    expect(toBestNPlacement(row)).toEqual({
      playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e1', rank: 2
    })
  })
})

describe('groupBestNByPlayer', () => {
  const pointsForRank = (rank: number) => (rank === 1 ? 10 : rank === 2 ? 5 : 1)

  it('groups placements by player and scores each result', () => {
    const groups = groupBestNByPlayer(
      [
        { playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e1', rank: 1 },
        { playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e2', rank: 2 },
        { playerUuid: 'p2', playerName: 'Bob', eventUuid: 'e1', rank: 3 }
      ],
      pointsForRank,
      10
    )

    expect(groups).toHaveLength(2)
    const alice = groups.find(g => g.playerUuid === 'p1')!
    expect(alice.results).toHaveLength(2)
    expect(alice.resultsByEvent.e1?.points).toBe(10)
    expect(alice.resultsByEvent.e2?.points).toBe(5)
  })

  it('only counts the best N results, dropping the rest', () => {
    const groups = groupBestNByPlayer(
      [
        { playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e1', rank: 1 },
        { playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e2', rank: 1 },
        { playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e3', rank: 2 }
      ],
      pointsForRank,
      2
    )

    const alice = groups[0]!
    expect(alice.resultsByEvent.e1?.counted).toBe(true)
    expect(alice.resultsByEvent.e2?.counted).toBe(true)
    expect(alice.resultsByEvent.e3?.counted).toBe(false)
  })

  it('attaches extra per-format fields without affecting scoring', () => {
    const groups = groupBestNByPlayer(
      [{ playerUuid: 'p1', playerName: 'Alice', eventUuid: 'e1', rank: 1 }],
      pointsForRank,
      10,
      () => ({ participationPoints: 2 })
    )

    expect(groups[0]!.resultsByEvent.e1?.participationPoints).toBe(2)
  })

  it('returns an empty array for no placements', () => {
    expect(groupBestNByPlayer([], pointsForRank, 10)).toEqual([])
  })
})
