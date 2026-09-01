// test\unit\utils\cittadino\cittadinoPoints.test.ts
import { describe, expect, it } from 'vitest'
import { cittadinoPointsForRank } from '~/utils/cittadino/cittadinoPoints'

describe('cittadinoPointsForRank', () => {
  it.each([
    [1, 25],
    [2, 18],
    [9, 2],
    [10, 1],
    [11, 1],
    [1000, 1]
  ])('rank %i -> %i points', (rank, points) => {
    expect(cittadinoPointsForRank(rank)).toBe(points)
  })
})
