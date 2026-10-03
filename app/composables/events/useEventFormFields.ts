// app\composables\events\useEventFormFields.ts
// Extracted from AddModal.vue so EditModal.vue shares it (like
// useLeagueFormFields.ts/useTournamentFormFields.ts): only the initial `state` values and submit
// behavior differ between create and edit
import * as v from 'valibot'
import type { InferOutput } from 'valibot'

function buildSchema(t: ReturnType<typeof useI18n>['t']) {
  return v.object({
    status: v.picklist(EVENT_STATUSES),
    companionCode: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
    name: v.pipe(v.string(), v.trim(), v.minLength(1, t('event.addModal.validation.nameRequired'))),
    tagline: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
    edition: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
    description: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
    practicalNotes: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
    ticketsUrl: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
    ticketsOnSaleOn: v.optional(v.nullable(v.string())),
    membershipRequired: v.optional(v.boolean()),
    membershipUrl: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
    organizerUuid: v.string(t('event.addModal.validation.nameRequired')),
    locationUuid: v.optional(v.string())
  })
}

export type EventFormState = Partial<InferOutput<ReturnType<typeof buildSchema>>>

export function useEventFormFields() {
  const { t } = useI18n()

  const { locationOptions, organizerOptions } = useLocationOrganizerOptions()

  const schema = buildSchema(t)

  const statusOptions = computed(() => EVENT_STATUSES.map(status => ({
    value: status,
    label: t(`event.addModal.statusOptions.${status}`),
    icon: EVENT_STATUS_ICONS[status],
    color: eventStatusColor(status)
  })))

  return {
    schema, statusOptions, locationOptions, organizerOptions
  }
}
