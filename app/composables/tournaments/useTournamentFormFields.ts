// app\composables\tournaments\useTournamentFormFields.ts
// Extracted out of AddModal.vue/EditModal.vue — schema + the lookup-table
// select options (locations/organizations/mtg_formats) are identical between
// create and edit, only the initial `state` values and submit behavior
// differ. Same reasoning as useTransactionFormFields.ts.
import * as v from 'valibot'
import type { InferOutput } from 'valibot'

function buildSchema(t: ReturnType<typeof useI18n>['t']) {
  return v.object({
    status: v.picklist(TOURNAMENT_STATUSES),
    companionCode: v.optional(v.nullable(v.string())),
    // .optional() here mirrors the pre-migration schema: "name" shows as
    // "required" in the UI (see UFormField required) but the validation
    // schema does not enforce it — a pre-existing inconsistency, left as is.
    name: v.optional(v.string(t('tournament.addModal.validation.nameRequired'))),
    description: v.optional(v.nullable(v.string())),
    entryFee: v.pipe(v.number(), v.minValue(0, t('tournament.addModal.validation.entryFeeNegative'))),
    prizes: v.optional(v.nullable(v.string())),
    formatUuid: v.string(),
    startDate: v.string(),
    startTime: v.string(),
    roundCount: v.pipe(
      v.number(),
      v.integer(),
      v.minValue(1, t('tournament.addModal.validation.roundCountPositive'))
    ),
    organizerUuid: v.optional(v.string()),
    locationUuid: v.optional(v.string())
  })
}

export type TournamentFormState = Partial<InferOutput<ReturnType<typeof buildSchema>>>

export function useTournamentFormFields() {
  const { t } = useI18n()

  const { data: locations } = useLocationsQuery()
  const { data: organizations } = useOrganizationsQuery()
  const { data: formats } = useMtgFormatsQuery()

  const schema = buildSchema(t)

  const statusOptions = computed(() => TOURNAMENT_STATUSES.map(status => ({
    value: status,
    label: t(`tournament.addModal.statusOptions.${status}`),
    icon: TOURNAMENT_STATUS_ICONS[status],
    color: tournamentStatusColor(status)
  })))

  const locationOptions = computed(() => (locations.value ?? []).map(location => ({
    value: location.uuid, label: location.name
  })))
  const organizerOptions = computed(() => (organizations.value ?? []).map(organization => ({
    value: organization.uuid, label: organization.name
  })))
  const formatOptions = computed(() => (formats.value ?? []).map(format => ({
    value: format.uuid, label: format.name
  })))

  return {
    schema, statusOptions, locationOptions, organizerOptions, formatOptions
  }
}
