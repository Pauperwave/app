// test\unit\composables\useStartDateField.test.ts
import { CalendarDate } from '@internationalized/date'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStartDateField } from '~/composables/useStartDateField'

describe('useStartDateField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to today when defaultToToday is true', () => {
    const state: { startDate?: string } = {}
    const { startDate } = useStartDateField(state)
    expect(startDate.value).toEqual(new CalendarDate(2026, 9, 15))
  })

  it('leaves the field empty when defaultToToday is false', () => {
    const state: { startDate?: string } = {}
    const { startDate } = useStartDateField(state, { defaultToToday: false })
    expect(startDate.value).toBeUndefined()
  })

  it('writes an ISO-ish date string back onto the state when startDate changes', async () => {
    const state: { startDate?: string } = {}
    const { startDate } = useStartDateField(state, { defaultToToday: false })
    startDate.value = new CalendarDate(2026, 3, 5)
    await vi.waitFor(() => expect(state.startDate).toBe('2026-03-05'))
  })

  it('reset restores the just-mounted value', () => {
    const state: { startDate?: string } = {}
    const { startDate, reset } = useStartDateField(state)
    startDate.value = new CalendarDate(2020, 1, 1)
    reset()
    expect(startDate.value).toEqual(new CalendarDate(2026, 9, 15))
  })

  it('formats the current start date in Italian long form', () => {
    const state: { startDate?: string } = {}
    const { formattedStartDate } = useStartDateField(state)
    expect(formattedStartDate.value).toBe('15 settembre 2026')
  })

  it('formats to an empty string when there is no date', () => {
    const state: { startDate?: string } = {}
    const { formattedStartDate } = useStartDateField(state, { defaultToToday: false })
    expect(formattedStartDate.value).toBe('')
  })
})
