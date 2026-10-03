// test\unit\utils\tournaments\tournamentTableCells.test.ts
import { describe, expect, it } from 'vitest'
import type { Row } from '@tanstack/vue-table'
import {
  durationLabel,
  sortGroupsBySizeElseText
} from '~/utils/tournaments/tournamentTableCells'

function leaf(value: string | null): Row<unknown> {
  return {
    getIsGrouped: () => false,
    subRows: [],
    getValue: () => value
  } as unknown as Row<unknown>
}

function group(size: number): Row<unknown> {
  return {
    getIsGrouped: () => true,
    subRows: Array.from({ length: size }),
    getValue: () => null
  } as unknown as Row<unknown>
}

describe('sortGroupsBySizeElseText', () => {
  it('sorts two groups by how many rows they hold', () => {
    expect(sortGroupsBySizeElseText(group(2), group(5), 'format')).toBeLessThan(0)
    expect(sortGroupsBySizeElseText(group(5), group(2), 'format')).toBeGreaterThan(0)
    expect(sortGroupsBySizeElseText(group(3), group(3), 'format')).toBe(0)
  })

  it('sorts leaf rows alphabetically, in Italian collation', () => {
    expect(sortGroupsBySizeElseText(leaf('Alba'), leaf('Zeta'), 'location')).toBeLessThan(0)
    expect(sortGroupsBySizeElseText(leaf('Zeta'), leaf('Alba'), 'location')).toBeGreaterThan(0)
    expect(sortGroupsBySizeElseText(leaf('è'), leaf('e'), 'location')).toBeGreaterThan(0)
  })

  it('puts an empty value last, whichever side it is on', () => {
    expect(sortGroupsBySizeElseText(leaf('Alba'), leaf(null), 'location')).toBe(-1)
    expect(sortGroupsBySizeElseText(leaf(null), leaf('Alba'), 'location')).toBe(1)
  })

  it('keeps two empty values tied', () => {
    expect(sortGroupsBySizeElseText(leaf(null), leaf(''), 'location')).toBe(0)
  })

  it('compares a group with a leaf by value, not by size', () => {
    expect(sortGroupsBySizeElseText(group(9), leaf('Alba'), 'format')).toBe(1)
  })
})

describe('durationLabel', () => {
  it('shows minutes alone under an hour', () => {
    expect(durationLabel('2026-10-03T18:00:00Z', '2026-10-03T18:45:00Z')).toBe('45min')
  })

  it('shows whole hours without a minutes part', () => {
    expect(durationLabel('2026-10-03T18:00:00Z', '2026-10-03T20:00:00Z')).toBe('2h')
  })

  it('shows hours and minutes together', () => {
    expect(durationLabel('2026-10-03T18:00:00Z', '2026-10-03T20:30:00Z')).toBe('2h 30min')
  })

  it('rounds the minutes down', () => {
    expect(durationLabel('2026-10-03T18:00:00Z', '2026-10-03T18:45:59Z')).toBe('45min')
  })
})
