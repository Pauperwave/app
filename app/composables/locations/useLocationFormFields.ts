// app\composables\locations\useLocationFormFields.ts
// Shared between AddModal.vue/EditModal.vue — just the validation schema
// (no lookup-table select options, unlike useTournamentFormFields.ts:
// Location has no FK fields, every field here is a plain string column).
import * as v from 'valibot'
import type { InferOutput } from 'valibot'
import type { NewLocationPayload } from '#shared/types/locations'
import type { OpeningHours } from '~/types'

function buildSchema(t: ReturnType<typeof useI18n>['t']) {
  return v.object({
    name: v.pipe(v.string(), v.minLength(1, t('location.addModal.validation.nameRequired'))),
    address: v.pipe(v.string(), v.minLength(1, t('location.addModal.validation.addressRequired'))),
    city: v.pipe(v.string(), v.minLength(1, t('location.addModal.validation.cityRequired'))),
    province: v.pipe(v.string(), v.minLength(1, t('location.addModal.validation.provinceRequired'))),
    postalCode: v.pipe(
      v.string(), v.minLength(1, t('location.addModal.validation.postalCodeRequired'))
    ),
    country: v.pipe(v.string(), v.minLength(1, t('location.addModal.validation.countryRequired'))),
    phone: v.optional(v.nullable(v.string())),
    email: v.optional(v.nullable(v.string())),
    website: v.optional(v.nullable(v.string())),
    googleMapsUrl: v.optional(v.nullable(v.string())),
    facebook: v.optional(v.nullable(v.string())),
    instagram: v.optional(v.nullable(v.string())),
    telegramChannel: v.optional(v.nullable(v.string())),
    whatsapp: v.optional(v.nullable(v.string())),
    temporarilyClosed: v.optional(v.boolean())
  })
}

export type LocationFormState = Partial<InferOutput<ReturnType<typeof buildSchema>>>
export type LocationFormData = InferOutput<ReturnType<typeof buildSchema>>

export function useLocationFormFields() {
  const { t } = useI18n()
  const schema = buildSchema(t)

  return { schema }
}

// Shared between AddModal.vue/EditModal.vue's onSubmit — same payload shape,
// only openingHours/image (kept outside the valibot schema, see the comment
// above) need to be passed in separately.
export function buildLocationPayload(
  data: LocationFormData,
  openingHours: OpeningHours,
  image: string | undefined
): NewLocationPayload {
  return {
    name: data.name,
    address: data.address,
    city: data.city,
    province: data.province,
    postalCode: data.postalCode,
    country: data.country,
    phone: data.phone || null,
    email: data.email || null,
    website: data.website || null,
    googleMapsUrl: data.googleMapsUrl || null,
    openingHours,
    image: image || null,
    facebook: data.facebook || null,
    instagram: data.instagram || null,
    telegramChannel: data.telegramChannel || null,
    whatsapp: data.whatsapp || null,
    temporarilyClosed: data.temporarilyClosed ?? false
  }
}
