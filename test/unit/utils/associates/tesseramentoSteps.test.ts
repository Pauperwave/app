// test\unit\utils\associates\tesseramentoSteps.test.ts
import { describe, expect, it } from 'vitest'
import { associateFormSchema } from '~/utils/associates/associateFormSchema'
import { buildTesseramentoSteps } from '~/utils/associates/tesseramentoSteps'

const t = (key: string) => key
const steps = buildTesseramentoSteps(t)
const formFields = Object.keys(associateFormSchema(t))
const stepFields = steps.flatMap(step => step.fields as string[])

describe('buildTesseramentoSteps', () => {
  it('goes email, verify, then the form, ending on the consents', () => {
    expect(steps.map(step => step.value)).toEqual([
      'email', 'verify', 'associateType', 'birthInfo', 'personalInfo', 'fiscalInfo',
      'residencyInfo', 'consents'
    ])
  })

  it('titles every step with a translation key', () => {
    expect(steps.every(step => step.title.length > 0)).toBe(true)
    expect(steps[0]!.title).toBe('tesseramento.steps.email.title')
  })

  it('has no field to validate on the login steps', () => {
    expect(steps[0]!.fields).toEqual([])
    expect(steps[1]!.fields).toEqual([])
  })

  it('only names fields the form has', () => {
    for (const field of stepFields) expect(formFields).toContain(field)
  })

  it('asks for every field of the form, once', () => {
    // The email is the one the login steps already proved
    const asked = formFields.filter(field => field !== 'email_address')

    expect([...stepFields].sort()).toEqual([...asked].sort())
    expect(new Set(stepFields).size).toBe(stepFields.length)
  })

  it('asks the birth date before the phone, whose rule depends on it', () => {
    const stepOf = (field: string) =>
      steps.findIndex(step => (step.fields as string[]).includes(field))

    expect(stepOf('born_date')).toBeLessThan(stepOf('phone_number'))
  })
})
