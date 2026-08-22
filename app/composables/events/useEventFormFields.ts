// app\composables\events\useEventFormFields.ts
// Extracted out of AddModal.vue so EditModal.vue can share it (2026-08-22,
// same reasoning as useLeagueFormFields.ts/useTournamentFormFields.ts) —
// only the initial `state` values and submit behavior differ between
// create and edit.
import * as v from 'valibot'
import type { InferOutput } from 'valibot'

function buildSchema(t: ReturnType<typeof useI18n>['t']) {
  return v.object({
    status: v.picklist(EVENT_STATUSES),
    companionCode: v.optional(v.nullable(v.string())),
    name: v.pipe(v.string(), v.minLength(1, t('event.addModal.validation.nameRequired'))),
    startDate: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
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
