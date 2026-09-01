// test\unit\composables\home\useQuickCreateItems.test.ts
import { describe, expect, it, vi } from 'vitest'
import { useQuickCreateItems } from '~/composables/home/useQuickCreateItems'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('useQuickCreateItems', () => {
  it('has one entry per domain, each opening its list page in create mode', () => {
    const items = useQuickCreateItems()
    expect(items.map(item => item.id)).toEqual([
      'associate', 'transaction', 'wanted-card', 'tournament', 'league', 'event', 'location'
    ])
    for (const item of items) {
      expect(item.to).toMatch(/\?action=create$/)
    }
  })

  it('groups community domains before competition domains', () => {
    const items = useQuickCreateItems()
    const groups = items.map(item => item.group)
    const lastCommunityIndex = groups.lastIndexOf('community')
    const firstCompetitionIndex = groups.indexOf('competitions')
    expect(lastCommunityIndex).toBeLessThan(firstCompetitionIndex)
  })
})
