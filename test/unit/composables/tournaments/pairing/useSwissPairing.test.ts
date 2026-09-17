// test\unit\composables\tournaments\pairing\useSwissPairing.test.ts
import { describe, expect, it } from 'vitest'
import { useSwissPairing } from '~/composables/tournaments/pairing/useSwissPairing'

describe('useSwissPairing', () => {
  const { calculatePairing, buildPreviewPairs } = useSwissPairing()

  describe('calculatePairing', () => {
    it('rejects an odd player count (byes are out of scope for phase 1)', () => {
      expect(calculatePairing(5)).toEqual({ canPlay: false, tableCount: 0 })
    })

    it('rejects fewer than 2 players', () => {
      expect(calculatePairing(0)).toEqual({ canPlay: false, tableCount: 0 })
      expect(calculatePairing(1)).toEqual({ canPlay: false, tableCount: 0 })
    })

    it('rejects a negative player count', () => {
      expect(calculatePairing(-2)).toEqual({ canPlay: false, tableCount: 0 })
    })

    it('splits an even player count into 1v1 tables', () => {
      expect(calculatePairing(2)).toEqual({ canPlay: true, tableCount: 1 })
      expect(calculatePairing(8)).toEqual({ canPlay: true, tableCount: 4 })
    })
  })

  describe('buildPreviewPairs', () => {
    it('pairs consecutive players in the given order', () => {
      expect(buildPreviewPairs(['a', 'b', 'c', 'd'])).toEqual([
        ['a', 'b'],
        ['c', 'd']
      ])
    })

    it('leaves a trailing single-player group when the count is odd', () => {
      expect(buildPreviewPairs(['a', 'b', 'c'])).toEqual([
        ['a', 'b'],
        ['c']
      ])
    })

    it('returns an empty array for no players', () => {
      expect(buildPreviewPairs([])).toEqual([])
    })
  })
})
