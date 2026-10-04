// test\unit\utils\associates\associateDetailFields.test.ts
import { describe, expect, it } from 'vitest'
import { buildAssociateDetailFields } from '~/utils/associates/associateDetailFields'
import type { Associate } from '~/types'

const t = (key: string) => key

function associate(overrides: Partial<Associate> = {}): Associate {
  return {
    first_name: 'Ada',
    last_name: 'Lovelace',
    tax_code: 'LVLDAA15T10Z114X',
    born_date: '1815-12-10',
    born_location: 'Londra',
    born_province: 'EE',
    born_state: 'Regno Unito',
    email_address: 'ada@example.com',
    phone_number: '+393203522674',
    residency_address: 'Via Roma',
    residency_house_number: '12',
    residency_city: 'Trento',
    residency_province: 'TN',
    residency_cap: '38122',
    request_date: '2026-01-05T10:00:00Z',
    association_date: '2026-01-20',
    latest_renewal_date: '2026-02-01',
    consent_data: true,
    consent_social: false,
    has_read_statute: true,
    has_acknowledged_surveillance_notice: false,
    ...overrides
  } as unknown as Associate
}

const valuesOf = (fields: { value: unknown }[]) => fields.map(field => field.value)
const field = (fields: { label: string, value: unknown }[], label: string) =>
  fields.find(item => item.label === `associate.columns.${label}`)?.value

describe('buildAssociateDetailFields', () => {
  it('lists the personal data in the order of the card', () => {
    const { anagrafica } = buildAssociateDetailFields(associate(), t)

    expect(valuesOf(anagrafica)).toEqual([
      'Ada', 'Lovelace', 'LVLDAA15T10Z114X', '10/12/1815', 'Londra', 'EE', 'Regno Unito'
    ])
  })

  it('labels every field with its column name', () => {
    const fields = Object.values(buildAssociateDetailFields(associate(), t)).flat()

    for (const item of fields) {
      expect(item.label).toMatch(/^associate\.columns\./)
      expect(item.icon).toBeTruthy()
    }
  })

  it('shows a dash for what is not filled in', () => {
    const { anagrafica, contatti } = buildAssociateDetailFields(associate({
      tax_code: '',
      born_date: null,
      born_location: '',
      born_province: '',
      born_state: '',
      phone_number: '',
      residency_house_number: null
    } as Partial<Associate>), t)

    expect(valuesOf(anagrafica).slice(2)).toEqual(['—', '—', '—', '—', '—'])
    expect(field(contatti, 'phoneNumber')).toBe('—')
    expect(field(contatti, 'residencyHouseNumber')).toBe('—')
  })

  it('shows a dash for a date that cannot be read', () => {
    const { anagrafica } = buildAssociateDetailFields(associate({ born_date: 'not-a-date' }), t)

    expect(field(anagrafica, 'bornDate')).toBe('—')
  })

  it('keeps the contact data as it is, and the phone readable', () => {
    const { contatti } = buildAssociateDetailFields(associate(), t)

    expect(field(contatti, 'emailAddress')).toBe('ada@example.com')
    expect(field(contatti, 'phoneNumber')).toBe(formatPhoneNumber('+393203522674'))
    expect(field(contatti, 'phoneNumber')).not.toBe('+393203522674')
    expect(field(contatti, 'residencyCity')).toBe('Trento')
  })

  it('formats the membership dates, with a dash when there is none', () => {
    const full = buildAssociateDetailFields(associate(), t).tesseramento
    const empty = buildAssociateDetailFields(associate({
      association_date: null, latest_renewal_date: null
    } as Partial<Associate>), t).tesseramento

    expect(valuesOf(full)).toEqual(['05/01/2026', '20/01/2026', '01/02/2026'])
    expect(valuesOf(empty)).toEqual(['05/01/2026', '—', '—'])
  })

  it('keeps the consents as booleans, for the badge', () => {
    const { consensi } = buildAssociateDetailFields(associate(), t)

    expect(valuesOf(consensi)).toEqual([true, false, true, false])
  })
})
