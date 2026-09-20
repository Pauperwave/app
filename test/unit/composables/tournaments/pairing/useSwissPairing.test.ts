// test\unit\composables\tournaments\pairing\useSwissPairing.test.ts
import { describe, expect, it } from 'vitest'
import { useSwissPairing } from '~/composables/tournaments/pairing/useSwissPairing'

describe('useSwissPairing', () => {
  const { calculatePairing, buildPreviewPairs } = useSwissPairing()

  describe('calculatePairing', () => {
    it('makes an odd player count playable, with a bye for the extra player', () => {
      expect(calculatePairing(5)).toEqual({ canPlay: true, tableCount: 2, hasBye: true })
    })

    it('rejects fewer than 2 players', () => {
      expect(calculatePairing(0)).toEqual({ canPlay: false, tableCount: 0, hasBye: false })
      expect(calculatePairing(1)).toEqual({ canPlay: false, tableCount: 0, hasBye: false })
    })

    it('rejects a negative player count', () => {
      expect(calculatePairing(-2)).toEqual({ canPlay: false, tableCount: 0, hasBye: false })
    })

    it('splits an even player count into 1v1 tables with no bye', () => {
      expect(calculatePairing(2)).toEqual({ canPlay: true, tableCount: 1, hasBye: false })
      expect(calculatePairing(8)).toEqual({ canPlay: true, tableCount: 4, hasBye: false })
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
