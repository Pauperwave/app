// test\unit\utils\standings\filterStandingsBySearch.test.ts
import { describe, expect, it } from 'vitest'
import { filterStandingsBySearch } from '~/utils/standings/filterStandingsBySearch'

describe('filterStandingsBySearch', () => {
  const standings = [
    { playerName: 'Alice Rossi' },
    { playerName: 'Bob Bianchi' },
    { playerName: 'Carol Verdi' }
  ]

  it('returns everything when the search is empty', () => {
    expect(filterStandingsBySearch(standings, '')).toEqual(standings)
    expect(filterStandingsBySearch(standings, '   ')).toEqual(standings)
  })

  it('filters case-insensitively by substring', () => {
    expect(filterStandingsBySearch(standings, 'ross')).toEqual([standings[0]])
    expect(filterStandingsBySearch(standings, 'BIANCHI')).toEqual([standings[1]])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterStandingsBySearch(standings, 'nobody')).toEqual([])
  })
})
