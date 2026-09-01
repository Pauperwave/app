// test\unit\composables\locations\useLocationFormFields.test.ts
import { describe, expect, it, vi } from 'vitest'
import * as v from 'valibot'
import { buildLocationPayload, useLocationFormFields } from '~/composables/locations/useLocationFormFields'
import type { LocationFormData } from '~/composables/locations/useLocationFormFields'
import { emptyOpeningHours } from '~/utils/locations/openingHours'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Il Covo dei Draghi',
    address: 'Via Roma 1',
    city: 'Trento',
    province: 'TN',
    postalCode: '38100',
    country: 'Italia',
    ...overrides
  }
}

describe('useLocationFormFields schema', () => {
  it('is valid with just the required fields', () => {
    const { schema } = useLocationFormFields()
    expect(v.safeParse(schema, validPayload()).success).toBe(true)
  })

  it.each(['name', 'address', 'city', 'province', 'postalCode', 'country'])(
    'requires %s',
    (field) => {
      const { schema } = useLocationFormFields()
      const result = v.safeParse(schema, validPayload({ [field]: '' }))
      expect(result.success).toBe(false)
    }
  )

  it('trims a required field before checking its length', () => {
    const { schema } = useLocationFormFields()
    const result = v.safeParse(schema, validPayload({ name: '   ' }))
    expect(result.success).toBe(false)
  })
})

describe('buildLocationPayload', () => {
  const data: LocationFormData = {
    ...validPayload(),
    phone: '',
    email: '',
    website: '',
    googleMapsUrl: '',
    facebook: '',
    instagram: '',
    telegramChannel: '',
    whatsapp: '',
    temporarilyClosed: undefined
  } as LocationFormData

  it('converts blank optional strings to null', () => {
    const payload = buildLocationPayload(data, emptyOpeningHours(), undefined)
    expect(payload.phone).toBeNull()
    expect(payload.email).toBeNull()
    expect(payload.website).toBeNull()
  })

  it('defaults temporarilyClosed to false when unset', () => {
    const payload = buildLocationPayload(data, emptyOpeningHours(), undefined)
    expect(payload.temporarilyClosed).toBe(false)
  })

  it('carries the image through when given, null otherwise', () => {
    const withImage = buildLocationPayload(data, emptyOpeningHours(), 'https://example.com/pic.jpg')
    expect(withImage.image).toBe('https://example.com/pic.jpg')
    const withoutImage = buildLocationPayload(data, emptyOpeningHours(), undefined)
    expect(withoutImage.image).toBeNull()
  })
})
