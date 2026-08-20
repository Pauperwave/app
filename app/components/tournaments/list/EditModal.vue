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

const toast = useToast()
const { t } = useI18n()
const { updateTournament } = useTournamentsMutations()

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
  entryFee: undefined,
  companionCode: undefined,
  endTime: undefined
})

const { startDate, formattedStartDate } = useStartDateField(state, { defaultToToday: false })

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
  state.entryFee = current.entryFee ?? 0
  state.companionCode = current.companionCode ?? undefined
  image.value = current.image ?? undefined
  imageCardName.value = current.imageCardName ?? undefined
  imageCardArtist.value = current.imageCardArtist ?? undefined
}, { immediate: true })

const {
  schema, statusOptions, locationOptions, organizerOptions, formatOptions
} = useTournamentFormFields()

type Schema = v.InferOutput<typeof schema>

const submitting = ref(false)

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
    leagueUuid: tournament.leagueUuid,
    eventUuid: tournament.eventUuid,
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

  submitting.value = true
  try {
    await updateTournament.mutateAsync({ id: tournament.id, edits: payload })
    toast.add({
      title: t('tournament.editModal.successToastTitle'),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('tournament.editModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
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
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="space-y-4">
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
