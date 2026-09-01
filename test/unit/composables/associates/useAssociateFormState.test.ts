// test\unit\composables\associates\useAssociateFormState.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createAssociateFormState, useAssociateTypeOptions } from '~/composables/associates/useAssociateFormState'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('useAssociateTypeOptions', () => {
  it('offers regular and sustaining options', () => {
    const options = useAssociateTypeOptions()
    expect(options.value.map(option => option.value)).toEqual(['regular', 'sustaining'])
  })
})

describe('createAssociateFormState', () => {
  it('defaults to a regular associate with every consent flag unchecked', () => {
    const state = createAssociateFormState()
    expect(state.associate_type).toBe('regular')
    expect(state.has_read_statute).toBe(false)
    expect(state.consent_data).toBe(false)
    expect(state.consent_social).toBe(false)
    expect(state.born_date).toBeUndefined()
  })

  it('starts with every text field empty, not undefined (so v-model binds cleanly)', () => {
    const state = createAssociateFormState()
    expect(state.first_name).toBe('')
    expect(state.tax_code).toBe('')
    expect(state.residency_house_number).toBeNull()
  })

  it('accepts an explicit initial born_date', () => {
    const bornDate = new Date(1990, 0, 1)
    const state = createAssociateFormState(bornDate)
    expect(state.born_date).toBe(bornDate)
  })

  it('returns an independent reactive object on each call', () => {
    const a = createAssociateFormState()
    const b = createAssociateFormState()
    a.first_name = 'Alice'
    expect(b.first_name).toBe('')
  })
})
