// test\unit\utils\toCsv.test.ts
import { describe, expect, it } from 'vitest'
import { toCsv } from '~/utils/toCsv'

describe('toCsv', () => {
  it('joins fields with commas and rows with line breaks', () => {
    expect(toCsv([['#', 'Giocatore', 'Punti'], [1, 'Mario Rossi', 42]]))
      .toBe('#,Giocatore,Punti\n1,Mario Rossi,42')
  })

  it('quotes a field that contains a comma', () => {
    expect(toCsv([['Rossi, Mario', 3]])).toBe('"Rossi, Mario",3')
  })

  it('quotes a field with a quote and doubles the quote', () => {
    expect(toCsv([['Mario "Il Mago" Rossi']])).toBe('"Mario ""Il Mago"" Rossi"')
  })

  it('quotes a field that contains a line break', () => {
    expect(toCsv([['riga 1\nriga 2']])).toBe('"riga 1\nriga 2"')
  })

  it('keeps numbers, including zero, as they are', () => {
    expect(toCsv([[0, 7.5]])).toBe('0,7.5')
  })

  it('gives an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })
})
