// test\unit\utils\tournaments\tournamentSteps.test.ts
import { describe, expect, it } from 'vitest'
import { reachedStepSlots, resolveActiveStepSlot } from '~/utils/tournaments/tournamentSteps'

const ALL = ['acceptance', 'round-1', 'round-2', 'round-3', 'awards', 'prizes', 'leaderboard']

describe('reachedStepSlots', () => {
  it('reaches only the acceptance step while the tournament is taking registrations', () => {
    expect(reachedStepSlots(ALL, 'acceptance', false)).toEqual(['acceptance'])
  })

  it('reaches the steps up to and including the current round', () => {
    expect(reachedStepSlots(ALL, 'round-1', false)).toEqual(['acceptance', 'round-1'])
    expect(reachedStepSlots(ALL, 'round-2', false))
      .toEqual(['acceptance', 'round-1', 'round-2'])
  })

  it('never reaches awards, prizes or the leaderboard before the tournament is completed', () => {
    const reached = reachedStepSlots(ALL, 'round-3', false)
    expect(reached).not.toContain('awards')
    expect(reached).not.toContain('prizes')
    expect(reached).not.toContain('leaderboard')
  })

  it('reaches every step once the tournament is completed', () => {
    expect(reachedStepSlots(ALL, 'leaderboard', true)).toEqual(ALL)
  })

  it('reaches only the first step while the current step is still unknown', () => {
    expect(reachedStepSlots(ALL, null, false)).toEqual(['acceptance'])
  })

  it('reaches only the first step when the current step is not in the list', () => {
    expect(reachedStepSlots(ALL, 'round-9', false)).toEqual(['acceptance'])
  })

  it('returns nothing for an empty list', () => {
    expect(reachedStepSlots([], 'acceptance', false)).toEqual([])
  })
})

describe('resolveActiveStepSlot', () => {
  const reached = ['acceptance', 'round-1']

  it('keeps a manually picked step that has been reached', () => {
    expect(resolveActiveStepSlot('acceptance', reached, 'round-1')).toBe('acceptance')
  })

  it('ignores a manually picked step that is still ahead', () => {
    expect(resolveActiveStepSlot('prizes', reached, 'round-1')).toBe('round-1')
  })

  it('falls back to the current step when nothing was picked by hand', () => {
    expect(resolveActiveStepSlot(null, reached, 'round-1')).toBe('round-1')
  })

  it('returns null when there is neither a picked nor a current step', () => {
    expect(resolveActiveStepSlot(null, reached, null)).toBeNull()
  })
})
