// app\utils\associates\tesseramentoSteps.ts
import type * as v from 'valibot'

type Schema = v.InferOutput<ReturnType<typeof associateFormObjectSchema>>

interface TesseramentoStep {
  value: string
  title: string
  fields: (keyof Schema)[]
}

// Each step's field names, used to validate only that step on "Avanti": UForm's validate({ name:
// [...] }) checks named fields whether or not they are rendered, so it works though every other
// step's UFormFields are v-if'd out
export function buildTesseramentoSteps(t: (key: string) => string) {
  return [
    { value: 'email', title: t('tesseramento.steps.email.title'), fields: [] },
    { value: 'verify', title: t('tesseramento.steps.verify.title'), fields: [] },
    {
      value: 'associateType',
      title: t('associate.addModal.sections.associateType'),
      fields: ['associate_type']
    },
    {
      value: 'birthInfo',
      title: t('associate.addModal.sections.birthInfo'),
      fields: ['born_location', 'born_date', 'born_province', 'born_state']
    },
    // After birthInfo, not before: phone_number's required-ness depends on born_date (isMinor.ts: a
    // minor may not have their own phone), so asking birth date first lets that cross-field rule
    // apply when this step's "Avanti" validates phone_number, instead of skipping it (born_date
    // unknown) and only catching a missing phone at the final submit, on a step where the field
    // isn't visible
    {
      value: 'personalInfo',
      title: t('associate.addModal.sections.personalInfo'),
      fields: ['first_name', 'last_name', 'phone_number']
    },
    {
      value: 'fiscalInfo',
      title: t('associate.addModal.sections.fiscalInfo'),
      fields: ['tax_code']
    },
    {
      value: 'residencyInfo',
      title: t('associate.addModal.sections.residencyInfo'),
      fields: [
        'residency_address', 'residency_house_number', 'residency_city', 'residency_province',
        'residency_cap'
      ]
    },
    {
      value: 'consents',
      title: t('associate.addModal.sections.consents'),
      fields: ['consent_data', 'consent_social', 'has_read_statute']
    }
  ] satisfies TesseramentoStep[]
}
