<!-- app\components\tournaments\list\AddModal.vue -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- the payload literal's first 5
// fields mirror EditModal.vue's, but leagueUuid/eventUuid/endsAt diverge
// (null here vs. the existing tournament's values there) — extracting a
// helper would need an overrides param for exactly the fields that differ,
// not worth it for 9 shared lines.
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewTournamentPayload } from '#shared/types/tournaments'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const { createTournament } = useTournamentsMutations()

const todayString = new Date().toISOString().substring(0, 10)

const state = reactive<TournamentFormState>({
  name: undefined,
  status: 'draft',
  startDate: todayString,
  startTime: '20:00',
  roundCount: 2,
  formatUuid: undefined as unknown as string,
  description: undefined,
  prizes: undefined,
  organizerUuid: undefined,
  locationUuid: undefined,
  entryFee: 5,
  companionCode: undefined
})

const { startDate, formattedStartDate } = useStartDateField(state)

const {
  schema, statusOptions, locationOptions, organizerOptions, formatOptions
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

type Schema = v.InferOutput<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const startsAt = combineDateAndTime(startDate.value!, event.data.startTime)

  const payload: NewTournamentPayload = {
    name: event.data.name ?? '',
    status: event.data.status,
    formatUuid: event.data.formatUuid,
    locationUuid: event.data.locationUuid || null,
    organizerUuid: event.data.organizerUuid || null,
    leagueUuid: null,
    eventUuid: null,
    startsAt: startsAt.toISOString(),
    endsAt: null,
    roundCount: event.data.roundCount,
    entryFee: event.data.entryFee,
    description: event.data.description || null,
    prizes: event.data.prizes || null,
    companionCode: event.data.companionCode || null
  }

  try {
    await createTournament.mutateAsync(payload)
    toast.add({
      title: t('tournament.addModal.successToastTitle'),
      description: t('tournament.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
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
      :label="$t('tournament.addModal.openButton')"
      :icon="ICONS.battle"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="space-y-4">
          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.tournamentData') }}
          </p>

          <TournamentsFieldsTournamentDataFields
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
          />

          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.organizerData') }}
          </p>

          <TournamentsFieldsOrganizerDataFields
            :state="state"
            :organizer-options="organizerOptions"
            :location-options="locationOptions"
          />
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('tournament.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
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
