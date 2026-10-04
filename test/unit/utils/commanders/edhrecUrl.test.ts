// test\unit\utils\commanders\edhrecUrl.test.ts
import { describe, expect, it } from 'vitest'
import { edhrecCommanderUrl } from '~/utils/commanders/edhrecUrl'

describe('edhrecCommanderUrl', () => {
  it('drops the comma of a legendary name', () => {
    expect(edhrecCommanderUrl('Maralen, Fae Ascendant'))
      .toBe('https://edhrec.com/commanders/maralen-fae-ascendant')
  })

  it('drops apostrophes and accents', () => {
    expect(edhrecCommanderUrl('Atraxa, Praetors\' Voice'))
      .toBe('https://edhrec.com/commanders/atraxa-praetors-voice')
    expect(edhrecCommanderUrl('Lim-Dûl the Necromancer'))
      .toBe('https://edhrec.com/commanders/lim-dul-the-necromancer')
  })

  it('uses the front face of a double-faced card', () => {
    expect(edhrecCommanderUrl('Esika, God of the Tree // The Prismatic Bridge'))
      .toBe('https://edhrec.com/commanders/esika-god-of-the-tree')
  })
})
