// test\unit\utils\tournaments\roundStatusSearch.test.ts
import { describe, expect, it } from 'vitest'
import {
  matchesRoundStatusFilter, matchesRoundStatusSearch, tableSearchLabel
} from '~/utils/tournaments/roundStatusSearch'

describe('matchesRoundStatusFilter', () => {
  it('matches everything under "all"', () => {
    expect(matchesRoundStatusFilter(true, 'all')).toBe(true)
    expect(matchesRoundStatusFilter(false, 'all')).toBe(true)
  })

  it('matches only done rows under "done"', () => {
    expect(matchesRoundStatusFilter(true, 'done')).toBe(true)
    expect(matchesRoundStatusFilter(false, 'done')).toBe(false)
  })

  it('matches only pending rows under "pending"', () => {
    expect(matchesRoundStatusFilter(false, 'pending')).toBe(true)
    expect(matchesRoundStatusFilter(true, 'pending')).toBe(false)
  })
})

describe('matchesRoundStatusSearch', () => {
  it('always matches an empty or whitespace-only query', () => {
    expect(matchesRoundStatusSearch('Tavolo 1', '')).toBe(true)
    expect(matchesRoundStatusSearch('Tavolo 1', '   ')).toBe(true)
  })

  it('matches case-insensitively as a substring', () => {
    expect(matchesRoundStatusSearch('Tavolo 1', 'TAVOLO')).toBe(true)
    expect(matchesRoundStatusSearch('Tavolo 1', 'avol')).toBe(true)
  })

  it('rejects a non-matching query', () => {
    expect(matchesRoundStatusSearch('Tavolo 1', 'Tavolo 2')).toBe(false)
  })
})

describe('tableSearchLabel', () => {
  it('combines the bare number and the translated heading', () => {
    expect(tableSearchLabel(3, 'Tavolo 3')).toBe('3 Tavolo 3')
  })
})
