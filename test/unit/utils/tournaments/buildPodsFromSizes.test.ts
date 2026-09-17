// test\unit\utils\tournaments\buildPodsFromSizes.test.ts
import { describe, expect, it } from 'vitest'
import { buildPodsFromSizes } from '~/utils/tournaments/buildPodsFromSizes'

describe('buildPodsFromSizes', () => {
  it('returns an empty array when there are no table sizes', () => {
    expect(buildPodsFromSizes(['a', 'b'], [])).toEqual([])
  })

  it('slices the ordered player list into pods of the given sizes', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    expect(buildPodsFromSizes(players, [4, 3])).toEqual([
      ['a', 'b', 'c', 'd'],
      ['e', 'f', 'g']
    ])
  })

  it('produces a shorter final pod when players run out', () => {
    const players = ['a', 'b', 'c']
    expect(buildPodsFromSizes(players, [2, 2])).toEqual([
      ['a', 'b'],
      ['c']
    ])
  })

  it('produces empty pods for sizes beyond the available players', () => {
    expect(buildPodsFromSizes(['a'], [1, 2])).toEqual([
      ['a'],
      []
    ])
  })
})
