// test\unit\composables\home\useHomeActionCounts.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useHomeActionCounts } from '~/composables/home/useHomeActionCounts'
import type { Associate, WantedCard } from '~/types'

const associates = ref<Associate[]>([])
const wantedCards = ref<WantedCard[]>([])

vi.mock('~/composables/associates/useAssociatesQuery', () => ({
  useAssociatesQuery: () => ({ data: associates })
}))
vi.mock('~/composables/wantedCards/useWantedCardsQuery', () => ({
  useWantedCardsQuery: () => ({ data: wantedCards })
}))

function makeAssociate(overrides: Partial<Associate>): Associate {
  return {
    membership_request_status: 'approved',
    membership_status: 'active',
    ...overrides
  } as Associate
}

describe('useHomeActionCounts', () => {
  it('counts pending membership requests separately from the approved roster', () => {
    associates.value = [
      makeAssociate({ membership_request_status: 'pending' }),
      makeAssociate({ membership_request_status: 'approved' }),
      makeAssociate({ membership_request_status: 'approved' })
    ]
    const { pendingAssociatesCount, associatesCount } = useHomeActionCounts()
    expect(pendingAssociatesCount.value).toBe(1)
    expect(associatesCount.value).toBe(2)
  })

  it('counts approved associates whose membership needs renewal', () => {
    associates.value = [
      makeAssociate({ membership_status: 'to_renew' }),
      makeAssociate({ membership_status: 'expired' }),
      makeAssociate({ membership_status: 'active' })
    ]
    const { associatesToRenewCount } = useHomeActionCounts()
    expect(associatesToRenewCount.value).toBe(2)
  })

  it('counts wanted cards still being searched for', () => {
    wantedCards.value = [
      { status: 'searching' } as WantedCard,
      { status: 'found' } as WantedCard,
      { status: 'searching' } as WantedCard
    ]
    const { wantedCardsSearchingCount } = useHomeActionCounts()
    expect(wantedCardsSearchingCount.value).toBe(2)
  })
})
