// test\unit\composables\tournaments\useCommanderPods.test.ts
import { describe, expect, it } from 'vitest'
import { useCommanderPods } from '~/composables/tournaments/useCommanderPods'

describe('useCommanderPods', () => {
  const { calculatePods, buildPreviewPods } = useCommanderPods()

  it('rejects counts below the minimum table size', () => {
    expect(calculatePods(0).canPlay).toBe(false)
    expect(calculatePods(1).canPlay).toBe(false)
    expect(calculatePods(2).canPlay).toBe(false)
  })

  it('rejects 5 players — no valid 3/4 combination', () => {
    expect(calculatePods(5).canPlay).toBe(false)
  })

  // Cases carried over from MagicTheGathering/league's own
  // useTableCalculator.test.ts, same algorithm.
  it.each([
    [3, [3]],
    [4, [4]],
    [6, [3, 3]],
    [7, [4, 3]],
    [8, [4, 4]],
    [11, [4, 4, 3]]
  ])('splits %i players into %j', (count, tableSizes) => {
    expect(calculatePods(count)).toEqual({
      canPlay: true, tableCount: tableSizes.length, tableSizes
    })
  })

  it('builds preview pods by slicing player ids into the computed sizes', () => {
    const playerIds = Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
    const pods = buildPreviewPods(playerIds)

    expect(pods.map(pod => pod.length)).toEqual([4, 4, 3])
    expect(pods.flat()).toEqual(playerIds)
  })

  it('returns no preview pods when the count has no valid split', () => {
    const playerIds = Array.from({ length: 5 }, (_, i) => `player-${i + 1}`)
    expect(buildPreviewPods(playerIds)).toEqual([])
  })
})
