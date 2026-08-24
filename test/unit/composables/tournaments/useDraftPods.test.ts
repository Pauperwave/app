// test\unit\composables\tournaments\useDraftPods.test.ts
import { describe, expect, it } from 'vitest'
import { useDraftPods } from '~/composables/tournaments/useDraftPods'

describe('useDraftPods', () => {
  const { calculatePods, buildPreviewPods } = useDraftPods()

  it('rejects zero or negative player counts', () => {
    expect(calculatePods(0).canPlay).toBe(false)
    expect(calculatePods(-1).canPlay).toBe(false)
  })

  it('plays a single table for any count up to the ideal size', () => {
    for (let count = 1; count <= 8; count++) {
      expect(calculatePods(count)).toEqual({ canPlay: true, tableCount: 1, tableSizes: [count] })
    }
  })

  it('rejects counts with no valid 6-8 split', () => {
    for (const count of [9, 10, 11, 17]) {
      expect(calculatePods(count).canPlay).toBe(false)
    }
  })

  // Every case from the user's own worked examples (2026-08-24).
  it.each([
    [12, [6, 6]],
    [13, [7, 6]],
    [14, [7, 7]],
    [15, [8, 7]],
    [16, [8, 8]],
    [18, [6, 6, 6]],
    [19, [7, 6, 6]],
    [20, [7, 7, 6]],
    [21, [7, 7, 7]],
    [22, [8, 7, 7]],
    [23, [8, 8, 7]],
    [24, [8, 8, 8]],
    [25, [7, 6, 6, 6]]
  ])('splits %i players into %j', (count, tableSizes) => {
    expect(calculatePods(count)).toEqual({
      canPlay: true, tableCount: tableSizes.length, tableSizes
    })
  })

  it('builds preview pods by slicing player ids into the computed sizes', () => {
    const playerIds = Array.from({ length: 13 }, (_, i) => `player-${i + 1}`)
    const pods = buildPreviewPods(playerIds)

    expect(pods.map(pod => pod.length)).toEqual([7, 6])
    expect(pods.flat()).toEqual(playerIds)
  })

  it('returns no preview pods when the count has no valid split', () => {
    const playerIds = Array.from({ length: 9 }, (_, i) => `player-${i + 1}`)
    expect(buildPreviewPods(playerIds)).toEqual([])
  })
})
