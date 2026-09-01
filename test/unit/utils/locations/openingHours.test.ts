// test\unit\utils\locations\openingHours.test.ts
import { describe, expect, it } from 'vitest'
import { DAYS_OF_WEEK, emptyOpeningHours } from '~/utils/locations/openingHours'

describe('emptyOpeningHours', () => {
  it('has a null entry for every day of the week', () => {
    const hours = emptyOpeningHours()
    expect(Object.keys(hours)).toEqual(DAYS_OF_WEEK)
    for (const day of DAYS_OF_WEEK) {
      expect(hours[day]).toBeNull()
    }
  })
})
