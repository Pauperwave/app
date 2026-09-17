// test\unit\utils\tournaments\pairingPlayerColor.test.ts
import { describe, expect, it } from 'vitest'
import { getPairingPlayerColorMap } from '~/utils/tournaments/pairingPlayerColor'

describe('getPairingPlayerColorMap', () => {
  it('assigns a distinct color per player up to the palette size', () => {
    const players = [{ value: 'p1' }, { value: 'p2' }, { value: 'p3' }, { value: 'p4' }]
    const map = getPairingPlayerColorMap(players)
    expect(map.get('p1')).toBe('primary')
    expect(map.get('p2')).toBe('secondary')
    expect(map.get('p3')).toBe('success')
    expect(map.get('p4')).toBe('info')
  })

  it('cycles back to the first color once the palette is exhausted', () => {
    const players = Array.from({ length: 7 }, (_, i) => ({ value: `p${i}` }))
    const map = getPairingPlayerColorMap(players)
    expect(map.get('p0')).toBe('primary')
    expect(map.get('p6')).toBe('primary')
  })

  it('returns an empty map for no players', () => {
    expect(getPairingPlayerColorMap([]).size).toBe(0)
  })
})
