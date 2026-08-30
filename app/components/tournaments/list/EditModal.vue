<!-- app\components\tournaments\list\EditModal.vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- see the same comment in
// AddModal.vue
import { CalendarDate } from '@internationalized/date'
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { NewTournamentPayload } from '#shared/types/tournaments'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

const open = defineModel<boolean>({ default: false })
const { tournament } = defineProps<{ tournament: Tournament | null }>()

const { t } = useI18n()
const { updateTournament } = useTournamentsMutations()
const { submitting, submitWithToast } = useSubmitWithToast()

// Same shape as AddModal.vue's initial state — formatUuid/organizerUuid/
// locationUuid must be present (even as undefined) or valibot's v.object()
// raises its own generic "missing key" issue instead of running the field's
// real check. The [open, tournament] watch below fills these immediately in
// practice, but this keeps the object shape correct even before that watch
// runs.
const state = reactive<TournamentFormState>({
  name: undefined,
  status: 'draft',
  startDate: undefined,
  startTime: undefined,
  roundCount: undefined,
  formatUuid: undefined,
  description: undefined,
  prizes: undefined,
  organizerUuid: undefined,
  locationUuid: undefined,
  leagueUuid: undefined,
  eventUuid: undefined,
  entryFee: undefined,
  companionCode: undefined,
  endTime: undefined
})

const { startDate, formattedStartDate } = useStartDateField(state, { defaultToToday: false })

// Same collision/density hint as AddModal.vue (issue #37 follow-up,
// 2026-08-23) — excludes the tournament being edited itself, since its own
// current date isn't a collision, it's the row this form already represents.
const { data: existingTournamentsData } = useTournamentsQuery()
const highlightedDates = computed(() => (existingTournamentsData.value ?? [])
  .filter(existing => existing.id !== tournament?.id)
  .map(existing => ({
    date: new Date(existing.startDate),
    color: tournamentStatusColor(existing.status),
    label: `${existing.name}${tournamentStageText(existing)}`
  })))

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as LocationsListEditModal.vue's `image`. imageCardName/
// imageCardArtist ride along for the same reason — see CardArtPicker.vue.
const image = ref<string | undefined>(undefined)
const imageCardName = ref<string | undefined>(undefined)
const imageCardArtist = ref<string | undefined>(undefined)

// Refills every time the modal opens on a (possibly new) tournament — same
// convention as TransactionsListEditModal.vue's watch on its `transaction` prop.
watch([open, () => tournament], ([isOpen, current]) => {
  if (!isOpen || !current) return

  const startsAt = new Date(current.startDate)
  startDate.value = new CalendarDate(
    startsAt.getFullYear(), startsAt.getMonth() + 1, startsAt.getDate()
  )

  state.name = current.name
  state.status = current.status
  state.startDate = current.startDate.substring(0, 10)
  state.startTime = startsAt.toTimeString().substring(0, 5)
  state.endTime = current.endDate
    ? new Date(current.endDate).toTimeString().substring(0, 5)
    : undefined
  state.roundCount = current.roundCount ?? 1
  state.formatUuid = current.formatUuid
  state.description = current.description ?? undefined
  state.prizes = current.prizes ?? undefined
  state.organizerUuid = current.organizerUuid ?? undefined
  state.locationUuid = current.locationUuid ?? undefined
  state.leagueUuid = current.leagueUuid ?? undefined
  state.eventUuid = current.eventUuid ?? undefined
  state.entryFee = current.entryFee ?? 0
  state.companionCode = current.companionCode ?? undefined
  image.value = current.image ?? undefined
  imageCardName.value = current.imageCardName ?? undefined
  imageCardArtist.value = current.imageCardArtist ?? undefined
}, { immediate: true })

const {
  schema, statusOptions, locationOptions, organizerOptions, formatOptions,
  leagueOptions, eventOptions
} = useTournamentFormFields()

type Schema = v.InferOutput<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!tournament) return

  const startsAt = combineDateAndTime(startDate.value!, event.data.startTime)
  const endsAt = event.data.endTime
    ? combineEndDateAndTime(startsAt, startDate.value!, event.data.endTime)
    : null

  const payload: NewTournamentPayload = {
    name: event.data.name ?? '',
    status: event.data.status,
    formatUuid: event.data.formatUuid,
    locationUuid: event.data.locationUuid || null,
    organizerUuid: event.data.organizerUuid || null,
    leagueUuid: event.data.leagueUuid || null,
    eventUuid: event.data.eventUuid || null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt ? endsAt.toISOString() : null,
    roundCount: event.data.roundCount,
    entryFee: event.data.entryFee,
    description: event.data.description || null,
    prizes: event.data.prizes || null,
    companionCode: event.data.companionCode || null,
    imageUrl: image.value ?? null,
    imageCardName: imageCardName.value ?? null,
    imageCardArtist: imageCardArtist.value ?? null
  }

  await submitWithToast(
    () => updateTournament.mutateAsync({ id: tournament.id, edits: payload }),
    {
      successTitle: t('tournament.editModal.successToastTitle'),
      errorTitle: t('tournament.editModal.errorToastTitle'),
      onSuccess: () => { open.value = false }
    }
  )
}
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-xl' }"
    :title="$t('tournament.editModal.title')"
  >
    <template #body>
      <UForm
        v-if="tournament"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="space-y-2">
          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.tournamentData') }}
          </p>

          <TournamentsFieldsTournamentDataFields
            v-model:image="image"
            v-model:image-card-name="imageCardName"
            v-model:image-card-artist="imageCardArtist"
            :state="state"
            :status-options="statusOptions"
            :format-options="formatOptions"
          />

          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.scheduling') }}
          </p>

          <TournamentsFieldsSchedulingFields
            v-model:start-date="startDate"
            :state="state"
            :formatted-start-date="formattedStartDate"
            :highlighted-dates="highlightedDates"
          />

          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.organizerData') }}
          </p>

          <TournamentsFieldsOrganizerDataFields
            :state="state"
            :organizer-options="organizerOptions"
            :location-options="locationOptions"
            :league-options="leagueOptions"
            :event-options="eventOptions"
          />
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('tournament.editModal.cancel')"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('tournament.editModal.save')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
