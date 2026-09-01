// test\unit\composables\transactions\useTransactionFormOptions.test.ts
import { CalendarDateTime } from '@internationalized/date'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as v from 'valibot'
import { useTransactionFormOptions } from '~/composables/transactions/useTransactionFormOptions'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/tournaments/useTournamentsQuery', () => ({
  useTournamentsQuery: () => ({ data: ref([]) })
}))
vi.mock('~/composables/events/useEventsQuery', () => ({
  useEventsQuery: () => ({ data: ref([]) })
}))

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    payer_is_associate: true,
    associate_uuid: 'a1',
    payment_datetime: new CalendarDateTime(2026, 9, 1, 12, 0),
    payment_amount: 10,
    payment_method: 'Cash',
    payment_type: 'Donation',
    received_by: 'Nardi Emanuele',
    ...overrides
  }
}

describe('useTransactionFormOptions', () => {
  it('is valid for an associate payer with no linked tournament/event', () => {
    const { schema } = useTransactionFormOptions()
    const result = v.safeParse(schema, validPayload())
    expect(result.success).toBe(true)
  })

  it('requires payer name/surname/email/tax code when not an associate', () => {
    const { schema } = useTransactionFormOptions()
    const result = v.safeParse(
      schema, validPayload({ payer_is_associate: false, associate_uuid: undefined })
    )
    expect(result.success).toBe(false)
    const paths = result.issues?.map(issue => issue.path?.[0]?.key)
    expect(paths).toEqual(expect.arrayContaining(['payer_name', 'payer_surname', 'payer_email', 'payer_tax_code']))
  })

  it('accepts a non-associate payer once the payer fields are filled in', () => {
    const { schema } = useTransactionFormOptions()
    const result = v.safeParse(schema, validPayload({
      payer_is_associate: false,
      associate_uuid: undefined,
      payer_name: 'Mario',
      payer_surname: 'Rossi',
      payer_email: 'mario@example.com',
      payer_tax_code: 'RSSMRA85M01H501Q'
    }))
    expect(result.success).toBe(true)
  })

  it('requires associate_uuid when payer_is_associate is true', () => {
    const { schema } = useTransactionFormOptions()
    const result = v.safeParse(schema, validPayload({ associate_uuid: undefined }))
    expect(result.success).toBe(false)
    expect(result.issues?.[0]?.path?.[0]?.key).toBe('associate_uuid')
  })

  it('requires tournament_uuid for a Tournament Fee', () => {
    const { schema } = useTransactionFormOptions()
    const result = v.safeParse(schema, validPayload({ payment_type: 'Tournament Fee' }))
    expect(result.success).toBe(false)
    expect(result.issues?.some(issue => issue.path?.[0]?.key === 'tournament_uuid')).toBe(true)
  })

  it('requires event_uuid for an Event Fee or Token Purchase', () => {
    const { schema } = useTransactionFormOptions()
    for (const paymentType of ['Event Fee', 'Token Purchase']) {
      const result = v.safeParse(schema, validPayload({ payment_type: paymentType }))
      expect(result.success).toBe(false)
      expect(result.issues?.some(issue => issue.path?.[0]?.key === 'event_uuid')).toBe(true)
    }
  })

  it('rejects a negative payment amount', () => {
    const { schema } = useTransactionFormOptions()
    const result = v.safeParse(schema, validPayload({ payment_amount: -5 }))
    expect(result.success).toBe(false)
  })

  it('lowercases the payer email', () => {
    const { schema } = useTransactionFormOptions()
    const result = v.safeParse(schema, validPayload({
      payer_is_associate: false,
      associate_uuid: undefined,
      payer_name: 'Mario',
      payer_surname: 'Rossi',
      payer_email: 'MARIO@EXAMPLE.COM',
      payer_tax_code: 'RSSMRA85M01H501Q'
    }))
    expect(result.success).toBe(true)
    expect((result.output as { payer_email?: string })?.payer_email).toBe('mario@example.com')
  })

  it('offers all five payment type options and four payment method options', () => {
    const { paymentTypeOptions, paymentMethodOptions } = useTransactionFormOptions()
    expect(paymentTypeOptions.value).toHaveLength(5)
    expect(paymentMethodOptions.value).toHaveLength(4)
  })

  it('offers one receiver option per staff name, each with a generated avatar', () => {
    const { receiverOptions } = useTransactionFormOptions()
    expect(receiverOptions.value.length).toBeGreaterThan(0)
    for (const option of receiverOptions.value) {
      expect(option.avatar.src).toBeTruthy()
    }
  })
})
