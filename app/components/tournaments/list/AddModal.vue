<!-- app\components\tournaments\list\AddModal.vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- the payload literal's first 5
// fields mirror EditModal.vue's, but leagueUuid/eventUuid/endsAt diverge
// (null here vs. the existing tournament's values there) — extracting a
// helper would need an overrides param for exactly the fields that differ,
// not worth it for 9 shared lines.
import { CalendarDate } from '@internationalized/date'
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewTournamentPayload } from '#shared/types/tournaments'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'
import type { Tournament } from '~/types'

const open = defineModel<boolean>({ default: false })

// All four seed the form when opened from somewhere other than this
// component's own trigger — EventsSingleDaySchedule.vue clicking an empty
// time slot, in particular (user request, 2026-08-22, "click and create a
// tournament in that day" like Google Calendar); initialLeagueUuid is the
// same idea for leagues/[leagueId]/index.vue's own "Nuovo torneo" button
// (user request, 2026-08-29). hideTrigger drops the bare AddButton in that
// case, since the calling page is the trigger instead — same v-model:open
// control either way. sourceTournament is the "Copia torneo" context-menu
// action (user request, 2026-08-29) — copies every field except status
// (reset to draft, a copy isn't already completed/cancelled) and startDate
// (defaults to today, like a brand new tournament — the source's original
// date is almost never what a duplicate should land on).
const {
  initialDate, initialTime, initialEventUuid, initialLeagueUuid, sourceTournament,
  hideTrigger = false
} = defineProps<{
  initialDate?: string
  initialTime?: string
  initialEventUuid?: string
  initialLeagueUuid?: string
  sourceTournament?: Tournament | null
  hideTrigger?: boolean
}>()

const toast = useToast()
const { t } = useI18n()

const { createTournament } = useTournamentsMutations()

const todayString = new Date().toISOString().substring(0, 10)

function createInitialState(): TournamentFormState {
  const source = sourceTournament
  return {
    name: source?.name,
    status: 'draft',
    startDate: initialDate ?? todayString,
    startTime: initialTime
      ?? (source ? new Date(source.startDate).toTimeString().substring(0, 5) : '20:00'),
    endTime: source?.endDate
      ? new Date(source.endDate).toTimeString().substring(0, 5)
      : '00:00',
    roundCount: source?.roundCount ?? 2,
    formatUuid: source?.formatUuid ?? undefined as unknown as string,
    description: source?.description ?? undefined,
    prizes: source?.prizes ?? undefined,
    organizerUuid: source?.organizerUuid ?? undefined,
    locationUuid: source?.locationUuid ?? undefined,
    leagueUuid: initialLeagueUuid ?? source?.leagueUuid ?? undefined,
    eventUuid: initialEventUuid ?? source?.eventUuid ?? undefined,
    entryFee: source?.entryFee ?? 5,
    companionCode: source?.companionCode ?? undefined
  }
}

const state = reactive<TournamentFormState>(createInitialState())

const { startDate, formattedStartDate, reset: resetStartDate } = useStartDateField(state)

// Existing tournament dates as a collision/density hint on the scheduling
// field's own calendar (issue #37 follow-up, 2026-08-23) — same query
// tournaments/index.vue already reads, Pinia Colada caches it so this is
// never a second network request.
const { data: existingTournamentsData } = useTournamentsQuery()
const highlightedDates = computed(() => (existingTournamentsData.value ?? []).map(existing => ({
  date: new Date(existing.startDate),
  color: tournamentStatusColor(existing.status),
  label: `${existing.name}${tournamentStageText(existing)}`
})))

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as LocationsListAddModal.vue's `image`. imageCardName/
// imageCardArtist ride along for the same reason — see CardArtPicker.vue.
const image = ref<string | undefined>(undefined)
const imageCardName = ref<string | undefined>(undefined)
const imageCardArtist = ref<string | undefined>(undefined)

// Re-applies initialDate/initialTime/initialEventUuid/sourceTournament every
// time the modal opens, not just on mount — EventsSingleDaySchedule.vue
// reuses one modal instance across many slot clicks (each with a different
// time), and "Copia torneo" likewise reuses one instance across different
// source tournaments, so a one-shot default in createInitialState() alone
// wouldn't update on a second click while the instance stays alive.
watch(open, (isOpen) => {
  if (!isOpen) return
  if (sourceTournament) {
    Object.assign(state, createInitialState())
    resetStartDate()
    image.value = sourceTournament.image ?? undefined
    imageCardName.value = sourceTournament.imageCardName ?? undefined
    imageCardArtist.value = sourceTournament.imageCardArtist ?? undefined
  }
  if (initialDate) {
    const [year, month, day] = initialDate.split('-').map(Number)
    startDate.value = new CalendarDate(year!, month!, day!)
  }
  if (initialTime) state.startTime = initialTime
  if (initialEventUuid) state.eventUuid = initialEventUuid
  if (initialLeagueUuid) state.leagueUuid = initialLeagueUuid
})

const {
  schema, statusOptions, locationOptions, organizerOptions, formatOptions,
  leagueOptions, eventOptions
} = useTournamentFormFields()

// Nearly every tournament created here is organized by Pauperwave at Smart
// Lab — defaulted once each list resolves (async, off useOrganizationsQuery/
// useLocationsQuery) rather than hardcoding a uuid, and only if the field is
// still empty so it never overrides a manual choice made before the lists
// finished loading. `startsWith` for the location: its full display name is
// "Smart Lab - Centro Giovani Rovereto" (see the locations seed migration).
watch(organizerOptions, (options) => {
  if (state.organizerUuid) return
  state.organizerUuid = options.find(option => option.label === 'Pauperwave')?.value
}, { immediate: true })
watch(locationOptions, (options) => {
  if (state.locationUuid) return
  state.locationUuid = options.find(option => option.label.startsWith('Smart Lab'))?.value
}, { immediate: true })

// Same defaulting convention as organizerUuid/locationUuid above — Commander
// is the format almost every tournament created here actually is.
watch(formatOptions, (options) => {
  if (state.formatUuid) return
  state.formatUuid = options.find(option => option.label === 'Commander')?.value ?? state.formatUuid
}, { immediate: true })

// Live-recalculates on every format change (unlike the organizer/location/
// format watches above, which only fill an empty field once) — roundCount
// always has a value, so there's no "empty" state to gate on, and the whole
// point is that switching format updates the suggested round count
// immediately (defaultRoundCountForFormat). Skipped while copying a source
// tournament
// (createInitialState already seeded roundCount from it, and the format
// watch above never overrides sourceTournament.formatUuid either).
watch(() => state.formatUuid, (formatUuid) => {
  if (sourceTournament) return
  const formatName = formatOptions.value.find(option => option.value === formatUuid)?.label
  state.roundCount = defaultRoundCountForFormat(formatName)
})

type Schema = v.InferOutput<typeof schema>

// UModal only hides/shows, it does not unmount the form, so the state has to
// be cleared explicitly — called on successful submit and on explicit
// "Annulla", but deliberately NOT on the X button or an outside click, which
// should preserve whatever the user typed (user decision 2026-08-20). Reapplies
// the same organizer/location/format defaults as the watches above, since
// those only fire once their respective options list changes, not on reset.
function resetForm() {
  Object.assign(state, createInitialState())
  resetStartDate()
  image.value = undefined
  imageCardName.value = undefined
  imageCardArtist.value = undefined
  state.organizerUuid = organizerOptions.value.find(option => option.label === 'Pauperwave')?.value
  state.locationUuid = locationOptions.value.find(option => option.label.startsWith('Smart Lab'))?.value
  state.formatUuid = formatOptions.value.find(option => option.label === 'Commander')?.value ?? state.formatUuid
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
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

  try {
    await createTournament.mutateAsync(payload)
    toast.add({
      title: t('tournament.addModal.successToastTitle'),
      description: t('tournament.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
    resetForm()
  } catch (err) {
    toast.add({
      title: t('tournament.addModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-xl' }"
    :title="$t('tournament.addModal.title')"
    :description="$t('tournament.addModal.description')"
  >
    <AddButton
      v-if="!hideTrigger"
      :label="$t('tournament.addModal.openButton')"
      :icon="ICONS.battle"
      @click="open = true"
    />

    <template #body>
      <UForm
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
            :label="$t('tournament.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false; resetForm()"
          />
          <UButton
            :label="$t('tournament.addModal.create')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="createTournament.isLoading.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
