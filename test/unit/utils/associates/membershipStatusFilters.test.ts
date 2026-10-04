// test\unit\utils\associates\membershipStatusFilters.test.ts
import { describe, expect, it } from 'vitest'
import {
  columnFiltersForStatus,
  countMembershipStatuses
} from '~/utils/associates/membershipStatusFilters'

describe('columnFiltersForStatus', () => {
  it('filters the membership status column by the status in the query', () => {
    expect(columnFiltersForStatus('active')).toEqual([{ id: 'membership_status', value: 'active' }])
    expect(columnFiltersForStatus('to_renew')).toEqual([
      { id: 'membership_status', value: 'to_renew' }
    ])
  })

  it('filters the pending renewal column, and only that one, for pending_renewal', () => {
    expect(columnFiltersForStatus('pending_renewal')).toEqual([
      { id: 'has_pending_renewal', value: true }
    ])
  })

  it('has no filter without a status', () => {
    expect(columnFiltersForStatus(undefined)).toEqual([])
    expect(columnFiltersForStatus(null)).toEqual([])
  })

  it('has no filter for a repeated query parameter', () => {
    expect(columnFiltersForStatus(['active', 'expired'])).toEqual([])
  })
})

describe('countMembershipStatuses', () => {
  const associate = (membership_status: string) => ({ membership_status }) as never

  it('counts every status of the roster', () => {
    expect(countMembershipStatuses([
      associate('active'), associate('active'), associate('to_renew'), associate('expired')
    ])).toEqual({ active: 2, to_renew: 1, expired: 1 })
  })

  it('is all zeros for an empty roster', () => {
    expect(countMembershipStatuses([])).toEqual({ active: 0, to_renew: 0, expired: 0 })
  })

  it('leaves out a status without a tab', () => {
    expect(countMembershipStatuses([associate('unpaid'), associate('active')]))
      .toEqual({ active: 1, to_renew: 0, expired: 0 })
  })
})
