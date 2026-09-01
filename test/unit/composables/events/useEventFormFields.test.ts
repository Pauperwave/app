// test\unit\composables\events\useEventFormFields.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as v from 'valibot'
import { useEventFormFields } from '~/composables/events/useEventFormFields'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/locations/useLocationsQuery', () => ({
  useLocationsQuery: () => ({ data: ref([{ uuid: 'loc1', name: 'Il Covo dei Draghi' }]) })
}))
vi.mock('~/composables/organizations/useOrganizationsQuery', () => ({
  useOrganizationsQuery: () => ({ data: ref([{ uuid: 'org1', name: 'APS Pauperwave' }]) })
}))

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    status: 'draft',
    name: 'Commanderwave Fest',
    startDate: '2026-09-01',
    startTime: '10:00',
    organizerUuid: 'org1',
    ...overrides
  }
}

describe('useEventFormFields', () => {
  it('is valid with the required fields filled in', () => {
    const { schema } = useEventFormFields()
    expect(v.safeParse(schema, validPayload()).success).toBe(true)
  })

  it('requires a non-blank name', () => {
    const { schema } = useEventFormFields()
    expect(v.safeParse(schema, validPayload({ name: '' })).success).toBe(false)
  })

  it('requires an organizer to be present (though not non-empty — v.string() only checks the type)', () => {
    const { schema } = useEventFormFields()
    expect(v.safeParse(schema, validPayload({ organizerUuid: undefined })).success).toBe(false)
    expect(v.safeParse(schema, validPayload({ organizerUuid: '' })).success).toBe(true)
  })

  it('does not require a location', () => {
    const { schema } = useEventFormFields()
    expect(v.safeParse(schema, validPayload({ locationUuid: undefined })).success).toBe(true)
  })

  it('maps locations and organizers from their queries into select options', () => {
    const { locationOptions, organizerOptions } = useEventFormFields()
    expect(locationOptions.value).toEqual([{ value: 'loc1', label: 'Il Covo dei Draghi' }])
    expect(organizerOptions.value).toEqual([{ value: 'org1', label: 'APS Pauperwave' }])
  })
})
