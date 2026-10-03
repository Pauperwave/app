// test\unit\shared\wantedCards\decklist.test.ts
import { describe, expect, it } from 'vitest'
import { looksLikeDecklist, parseDecklist } from '../../../../shared/utils/wantedCards/decklist'

describe('parseDecklist', () => {
  it('reads quantity, name, set and collector number', () => {
    const { entries, invalid } = parseDecklist('1 Clock of Omens (M13) 202')
    expect(invalid).toEqual([])
    expect(entries).toEqual([{
      line: 1,
      raw: '1 Clock of Omens (M13) 202',
      quantity: 1,
      name: 'Clock of Omens',
      setCode: 'm13',
      collectorNumber: '202',
      foil: false
    }])
  })

  it('keeps both halves of a double-faced name', () => {
    const [entry] = parseDecklist('1 Storm the Vault // Vault of Catlacan (RIX) 173').entries
    expect(entry?.name).toBe('Storm the Vault // Vault of Catlacan')
    expect(entry?.setCode).toBe('rix')
    expect(entry?.collectorNumber).toBe('173')
  })

  it('keeps commas in the name', () => {
    const [entry] = parseDecklist('1 Memnarch, the Warden (FRC) 15').entries
    expect(entry?.name).toBe('Memnarch, the Warden')
  })

  it('accepts a set-less line, an "x" after the quantity and a missing quantity', () => {
    const { entries } = parseDecklist('2x Lightning Bolt\nCounterspell')
    expect(entries.map(({ quantity, name, setCode }) => ({ quantity, name, setCode }))).toEqual([
      { quantity: 2, name: 'Lightning Bolt', setCode: null },
      { quantity: 1, name: 'Counterspell', setCode: null }
    ])
  })

  it('reads a *F* marker as foil', () => {
    const [entry] = parseDecklist('1 Erode (SOS) 15 *F*').entries
    expect(entry?.foil).toBe(true)
    expect(entry?.collectorNumber).toBe('15')
  })

  it('skips blank lines, headers and comments but keeps real line numbers', () => {
    const text = 'Deck\n\n// notes\n1 Erode (SOS) 15\nSideboard\n1 Radiant Lotus (DFT) 240'
    expect(parseDecklist(text).entries.map(entry => entry.line)).toEqual([4, 6])
  })

  it('handles Windows line endings', () => {
    expect(parseDecklist('1 Erode (SOS) 15\r\n1 Stock Up (DFT) 67\r\n').entries).toHaveLength(2)
  })

  it('reports a quantity outside the sane range as invalid', () => {
    const { entries, invalid } = parseDecklist('0 Erode (SOS) 15\n500 Erode (SOS) 15')
    expect(entries).toEqual([])
    expect(invalid.map(line => line.line)).toEqual([1, 2])
  })
})

describe('looksLikeDecklist', () => {
  it('accepts a full export', () => {
    expect(looksLikeDecklist('1 Clock of Omens (M13) 202\n1 Erode (SOS) 15')).toBe(true)
  })

  it('rejects ordinary messages', () => {
    expect(looksLikeDecklist('2 pizze')).toBe(false)
    expect(looksLikeDecklist('ciao, come stai?')).toBe(false)
    expect(looksLikeDecklist('')).toBe(false)
  })

  it('rejects a list with one line that is not a card', () => {
    expect(looksLikeDecklist('1 Erode (SOS) 15\nciao a tutti')).toBe(false)
  })
})
