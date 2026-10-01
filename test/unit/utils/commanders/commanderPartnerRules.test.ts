// test\unit\utils\commanders\commanderPartnerRules.test.ts
import { describe, expect, it } from 'vitest'
import {
  createPartnerRules, type PartnerRuleCard
} from '#shared/utils/commanders/commanderPartnerRules'

function card(overrides: Partial<PartnerRuleCard> & { name: string }): PartnerRuleCard {
  return {
    scryfallId: `id-${overrides.name}`,
    partnerType: null,
    keywords: [],
    partnerWithScryfallId: null,
    ...overrides
  }
}

const catalog: PartnerRuleCard[] = [
  card({ name: 'Plain Commander' }),
  card({ name: 'Thrasios', partnerType: 'partner' }),
  card({ name: 'Tymna', partnerType: 'partner' }),
  card({ name: 'Cazur', partnerType: 'partner_with', partnerWithScryfallId: 'id-Ukkima' }),
  card({ name: 'Ukkima', partnerType: 'partner_with', partnerWithScryfallId: 'id-Cazur' }),
  card({ name: 'Orphan', partnerType: 'partner_with', partnerWithScryfallId: 'id-Unknown' }),
  card({ name: 'Jaheira', partnerType: 'background_commander' }),
  card({ name: 'Wyll', partnerType: 'background_commander' }),
  card({ name: 'Candlekeep Sage', partnerType: 'background' }),
  card({ name: 'Rory', partnerType: 'doctors_companion' }),
  card({ name: 'The Doctor', partnerType: 'doctor' }),
  card({ name: 'Ellivere', partnerType: 'friends_forever' }),
  card({ name: 'Lurrus', keywords: ['Companion', 'Lifelink'] })
]

const rules = createPartnerRules(catalog)

describe('getPartnerType', () => {
  it('reads the type from the catalog', () => {
    expect(rules.getPartnerType('Thrasios')).toBe('partner')
  })

  it('treats a card with no partner type, or not in the catalog, as a plain commander', () => {
    expect(rules.getPartnerType('Plain Commander')).toBe('commander')
    expect(rules.getPartnerType('Not In Catalog')).toBe('commander')
  })
})

describe('getAllowedPartners', () => {
  it('lets a partner pair with any other partner', () => {
    expect(rules.getAllowedPartners('Thrasios')).toEqual(['Thrasios', 'Tymna'])
  })

  it('gives a "Choose a Background" creature only real Backgrounds, never another creature', () => {
    expect(rules.getAllowedPartners('Jaheira')).toEqual(['Candlekeep Sage'])
  })

  it('gives a Background the creatures that choose one', () => {
    expect(rules.getAllowedPartners('Candlekeep Sage')).toEqual(['Jaheira', 'Wyll'])
  })

  it('handles friends forever and the Doctor companion', () => {
    expect(rules.getAllowedPartners('Ellivere')).toEqual(['Ellivere'])
    expect(rules.getAllowedPartners('Rory')).toEqual(['Rory'])
  })

  it('offers nothing to a plain commander or an unknown card', () => {
    expect(rules.getAllowedPartners('Plain Commander')).toEqual([])
    expect(rules.getAllowedPartners('Not In Catalog')).toEqual([])
  })

  it('offers nothing for partner types without a list (the known gap)', () => {
    expect(rules.getPartnerType('The Doctor')).toBe('doctor')
    expect(rules.getAllowedPartners('The Doctor')).toEqual([])
  })
})

describe('getExactPartnerName', () => {
  it('resolves the one named partner of a "partner with" commander', () => {
    expect(rules.getExactPartnerName('Cazur')).toBe('Ukkima')
    expect(rules.getExactPartnerName('Ukkima')).toBe('Cazur')
  })

  it('is null for other types, and when the named partner is not in the catalog', () => {
    expect(rules.getExactPartnerName('Thrasios')).toBeNull()
    expect(rules.getExactPartnerName('Orphan')).toBeNull()
  })
})

describe('whitelists', () => {
  it('buckets every card by its partner type and Companion keyword', () => {
    expect(rules.whitelists.commander).toHaveLength(catalog.length)
    expect(rules.whitelists.companion).toEqual(['Lurrus'])
    expect(rules.whitelists.partnerWith).toEqual(['Cazur', 'Ukkima', 'Orphan'])
  })
})
