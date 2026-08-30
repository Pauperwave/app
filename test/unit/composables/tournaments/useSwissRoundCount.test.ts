// test\unit\composables\tournaments\useSwissRoundCount.test.ts
import { describe, expect, it } from 'vitest'
import { useSwissRoundCount } from '~/composables/tournaments/useSwissRoundCount'

describe('useSwissRoundCount', () => {
  const { calculateRoundCount } = useSwissRoundCount()

  it.each([
    [0, 3],
    [1, 3],
    [8, 3],
    [9, 4],
    [16, 4],
    [17, 5],
    [32, 5],
    [33, 6],
    [64, 6],
    [65, 7],
    [128, 7],
    [129, 8],
    [226, 8],
    [227, 9],
    [409, 9],
    [410, 10],
    [1000, 10]
  ])('gives %i players %i rounds', (registeredPlayers, rounds) => {
    expect(calculateRoundCount(registeredPlayers)).toBe(rounds)
  })

  it('a manual override wins outright, regardless of player count', () => {
    expect(calculateRoundCount(100, 3)).toBe(3)
    expect(calculateRoundCount(4, 7)).toBe(7)
    expect(calculateRoundCount(4, 0)).toBe(0)
  })

  it('ignores a null/undefined override and falls back to the table', () => {
    expect(calculateRoundCount(9, null)).toBe(4)
    expect(calculateRoundCount(9, undefined)).toBe(4)
  })
})
