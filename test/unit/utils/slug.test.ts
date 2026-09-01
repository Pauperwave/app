// test\unit\utils\slug.test.ts
import { describe, expect, it } from 'vitest'
import { slugify } from '~/utils/slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Emanuele Nardi')).toBe('emanuele-nardi')
  })

  it('strips accents, dropping apostrophes rather than treating them as separators', () => {
    expect(slugify('L\'Associazione Città')).toBe('lassociazione-citta')
  })
})
