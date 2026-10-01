// test\unit\composables\tournaments\list\useTournamentStatusSections.test.ts
import { describe, expect, it, vi } from 'vitest'
import { useTournamentStatusSections } from '~/composables/tournaments/list/useTournamentStatusSections'
import type { Tournament } from '~/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function makeTournament(overrides: Partial<Tournament>): Tournament {
  return {
    id: 1,
    status: 'registration_open',
    isPinned: false,
    ...overrides
  } as Tournament
}

describe('useTournamentStatusSections', () => {
  it('orders sections by status, most actionable first, skipping empty ones', () => {
    const tournaments = [
      makeTournament({ id: 1, status: 'completed' }),
      makeTournament({ id: 2, status: 'in_progress' }),
      makeTournament({ id: 3, status: 'registration_open' })
    ]

    const { sections } = useTournamentStatusSections(() => tournaments)

    expect(sections.value.map(section => section.key))
      .toEqual(['in_progress', 'registration_open', 'completed'])
  })

  it('puts pinned tournaments in their own section above every status one', () => {
    const tournaments = [
      makeTournament({ id: 1, status: 'in_progress' }),
      makeTournament({ id: 2, status: 'completed', isPinned: true })
    ]

    const { sections } = useTournamentStatusSections(() => tournaments)

    expect(sections.value.map(section => section.key)).toEqual(['pinned', 'in_progress'])
    expect(sections.value[0]?.tournaments.map(tournament => tournament.id)).toEqual([2])
  })

  it('removes a pinned tournament from its status section', () => {
    const tournaments = [
      makeTournament({ id: 1, status: 'registration_open', isPinned: true }),
      makeTournament({ id: 2, status: 'registration_open' })
    ]

    const { sections } = useTournamentStatusSections(() => tournaments)

    const statusSection = sections.value.find(section => section.key === 'registration_open')
    expect(statusSection?.tournaments.map(tournament => tournament.id)).toEqual([2])
  })

  it('has no pinned section when nothing is pinned', () => {
    const { sections } = useTournamentStatusSections(() => [makeTournament({ id: 1 })])

    expect(sections.value.some(section => section.key === 'pinned')).toBe(false)
  })

  it('flattens the range in drawn order, pinned first', () => {
    const tournaments = [
      makeTournament({ id: 1, status: 'in_progress' }),
      makeTournament({ id: 2, status: 'completed', isPinned: true }),
      makeTournament({ id: 3, status: 'registration_open' })
    ]

    const { range } = useTournamentStatusSections(() => tournaments)

    expect(range.value).toEqual([2, 1, 3])
  })
})
