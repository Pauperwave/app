// test\unit\utils\seededShuffle.test.ts
import { describe, expect, it } from 'vitest'
import {
  MAX_SHUFFLE_SEED, formatShuffleSeed, parseShuffleSeed, randomShuffleSeed, seededShuffle
} from '#shared/utils/seededShuffle'

const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

describe('seededShuffle', () => {
  it('gives the same order for the same seed', () => {
    expect(seededShuffle(players, 1234)).toEqual(seededShuffle(players, 1234))
  })

  it('does not depend on the order the players come in', () => {
    expect(seededShuffle([...players].reverse(), 42)).toEqual(seededShuffle(players, 42))
  })

  it('gives different orders for different seeds', () => {
    expect(seededShuffle(players, 1)).not.toEqual(seededShuffle(players, 2))
  })

  it('keeps every player exactly once and does not mutate the input', () => {
    const input = [...players]
    const shuffled = seededShuffle(input, 7)
    expect([...shuffled].sort()).toEqual(players)
    expect(input).toEqual(players)
  })

  it('handles empty and single-player lists', () => {
    expect(seededShuffle([], 5)).toEqual([])
    expect(seededShuffle(['a'], 5)).toEqual(['a'])
  })
})

describe('formatShuffleSeed', () => {
  it('writes a seed as three letters and three digits', () => {
    expect(formatShuffleSeed(0)).toBe('AAA-000')
    expect(formatShuffleSeed(7)).toBe('AAA-007')
    expect(formatShuffleSeed(1_000)).toBe('AAB-000')
    expect(formatShuffleSeed(MAX_SHUFFLE_SEED)).toBe('ZZZ-999')
  })

  it('round-trips every kind of seed', () => {
    for (const seed of [0, 1, 999, 1_000, 26_000, 123_456, 9_999_999, MAX_SHUFFLE_SEED]) {
      expect(parseShuffleSeed(formatShuffleSeed(seed))).toBe(seed)
    }
  })

  it('gives a different code to every seed', () => {
    const codes = new Set(Array.from(
      { length: 5_000 },
      (_, index) => formatShuffleSeed(index * 3_517 % (MAX_SHUFFLE_SEED + 1))
    ))
    expect(codes.size).toBe(5_000)
  })

  it('offers 17.5 million codes, far more than a table assignment needs to tell apart', () => {
    expect(MAX_SHUFFLE_SEED + 1).toBe(17_576_000)
  })
})

describe('parseShuffleSeed', () => {
  it('ignores case and accepts the dash being left out or replaced by a space', () => {
    const expected = parseShuffleSeed('SEC-123')
    expect(expected).not.toBeNull()
    expect(parseShuffleSeed('sec-123')).toBe(expected)
    expect(parseShuffleSeed('SEC123')).toBe(expected)
    expect(parseShuffleSeed(' sec 123 ')).toBe(expected)
  })

  it('rejects anything that is not three letters and three digits', () => {
    for (const value of ['', null, undefined, 'SE-123', 'SECT-123', 'SEC-12', 'SEC-1234', '123456', 'S3C-123']) {
      expect(parseShuffleSeed(value)).toBeNull()
    }
  })
})

describe('randomShuffleSeed', () => {
  it('always produces a valid, round-trippable seed', () => {
    for (let i = 0; i < 50; i++) {
      const seed = randomShuffleSeed()
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThanOrEqual(MAX_SHUFFLE_SEED)
      expect(parseShuffleSeed(formatShuffleSeed(seed))).toBe(seed)
    }
  })
})
