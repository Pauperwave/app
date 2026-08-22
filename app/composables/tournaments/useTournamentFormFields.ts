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
    endTime: v.optional(v.string()),
    roundCount: v.pipe(
      v.number(),
      v.integer(),
      v.minValue(1, t('tournament.addModal.validation.roundCountPositive'))
    ),
    organizerUuid: v.optional(v.string()),
    locationUuid: v.optional(v.string()),
    // Both optional and mutually independent (CLAUDE.md: "a tournament's
    // parent league/event is optional and polymorphic") — nothing stops a
    // tournament from having neither, or in principle both, though the UI
    // doesn't currently offer a reason to pick both at once. Nullable (not
    // just optional, unlike organizerUuid/locationUuid above): USelectMenu's
    // `clear` button sets the model value to null, not undefined, and the
    // whole point of that button is letting a tournament be unlinked from
    // its league/event again — validation has to accept the value the UI
    // actually produces.
    leagueUuid: v.optional(v.nullable(v.string())),
    eventUuid: v.optional(v.nullable(v.string()))
  })
}

export type TournamentFormState = Partial<InferOutput<ReturnType<typeof buildSchema>>>

export function useTournamentFormFields() {
  const { t } = useI18n()

  const { data: formats } = useMtgFormatsQuery()
  const { locationOptions, organizerOptions } = useLocationOrganizerOptions()
  const { data: leagues } = useLeaguesQuery()
  const { data: events } = useEventsQuery()

  const schema = buildSchema(t)

  const statusOptions = computed(() => TOURNAMENT_STATUSES.map(status => ({
    value: status,
    label: t(`tournament.addModal.statusOptions.${status}`),
    icon: TOURNAMENT_STATUS_ICONS[status],
    color: tournamentStatusColor(status)
  })))

  const formatOptions = computed(() => (formats.value ?? []).map(format => ({
    value: format.uuid, label: format.name
  })))

  const leagueOptions = computed(() => (leagues.value ?? []).map(league => ({
    value: league.uuid, label: league.name
  })))
  const eventOptions = computed(() => (events.value ?? []).map(event => ({
    value: event.uuid, label: event.name
  })))

  return {
    schema, statusOptions, locationOptions, organizerOptions, formatOptions,
    leagueOptions, eventOptions
  }
}
