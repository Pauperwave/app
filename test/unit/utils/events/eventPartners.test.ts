// test\unit\utils\events\eventPartners.test.ts
import { describe, expect, it } from 'vitest'
import { cleanEventPartners, groupEventPartners } from '#shared/utils/events/eventPartners'

describe('cleanEventPartners', () => {
  it('drops rows without a name and trims the rest', () => {
    const cleaned = cleanEventPartners([
      { name: '  Orangucards ', role: 'collaborator', logoUrl: '', linkUrl: ' https://example.com ' },
      { name: '   ', role: 'sponsor', logoUrl: 'https://logo', linkUrl: null },
      { name: 'Cardmarket', role: 'sponsor', logoUrl: null, linkUrl: null }
    ])

    expect(cleaned).toEqual([
      { name: 'Orangucards', role: 'collaborator', logoUrl: null, linkUrl: 'https://example.com' },
      { name: 'Cardmarket', role: 'sponsor', logoUrl: null, linkUrl: null }
    ])
  })

  it('keeps the order it is given', () => {
    const names = cleanEventPartners([
      { name: 'B', role: 'sponsor', logoUrl: null, linkUrl: null },
      { name: 'A', role: 'collaborator', logoUrl: null, linkUrl: null }
    ]).map(partner => partner.name)

    expect(names).toEqual(['B', 'A'])
  })
})

describe('groupEventPartners', () => {
  it('lists collaborators before sponsors, each group in its own order, skipping empty groups', () => {
    const groups = groupEventPartners([
      { name: 'Cardmarket', role: 'sponsor' as const },
      { name: 'Orangucards', role: 'collaborator' as const },
      { name: 'Lega Pauper Italia', role: 'collaborator' as const }
    ])

    expect(groups).toEqual([
      {
        role: 'collaborator',
        partners: [
          { name: 'Orangucards', role: 'collaborator' },
          { name: 'Lega Pauper Italia', role: 'collaborator' }
        ]
      },
      { role: 'sponsor', partners: [{ name: 'Cardmarket', role: 'sponsor' }] }
    ])
    expect(groupEventPartners([{ name: 'X', role: 'sponsor' as const }]).map(group => group.role))
      .toEqual(['sponsor'])
  })
})
