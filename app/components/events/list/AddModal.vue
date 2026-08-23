<!-- app\components\events\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewEventPayload } from '#shared/types/events'
import type { EventFormState } from '~/composables/events/useEventFormFields'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// Migrated off the name/email placeholder stub onto the real `events` table
// (2026-08-15) — locations/organizations, see
// useLocationsQuery.ts/useOrganizationsQuery.ts (shared with tournaments'
// AddModal.vue).
const { createEvent } = useEventsMutations()
const {
  schema, statusOptions, locationOptions, organizerOptions
} = useEventFormFields()

const todayString = new Date().toISOString().substring(0, 10)

function createInitialState(): EventFormState {
  return {
    name: undefined,
    status: 'draft',
    startDate: todayString,
    startTime: '08:00',
    endTime: '00:00',
    organizerUuid: undefined as unknown as string,
    locationUuid: undefined,
    companionCode: undefined
  }
}

const state = reactive<EventFormState>(createInitialState())

// Nearly every event created here is organized by Pauperwave at Smart Lab —
// same defaulting convention as TournamentsListAddModal.vue's own (user
// request, 2026-08-23), defaulted once each list resolves (async, off
// useOrganizationsQuery/useLocationsQuery) and only if the field is still
// empty so it never overrides a manual choice made before the lists finished
// loading. `startsWith` for the location: its full display name is
// "Smart Lab - Centro Giovani Rovereto" (see the locations seed migration).
watch(organizerOptions, (options) => {
  if (state.organizerUuid) return
  state.organizerUuid = options.find(option => option.label === 'Pauperwave')?.value
}, { immediate: true })
watch(locationOptions, (options) => {
  if (state.locationUuid) return
  state.locationUuid = options.find(option => option.label.startsWith('Smart Lab'))?.value
}, { immediate: true })

const { startDate, formattedStartDate, reset: resetStartDate } = useStartDateField(state)

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as TournamentsListAddModal.vue's `image`. No card-name/
// artist attribution pair here (unlike tournaments/leagues): the `events`
// table has no image_card_name/image_card_artist columns.
const image = ref<string | undefined>(undefined)

type Schema = v.InferOutput<typeof schema>

// UModal only hides/shows, it does not unmount the form, so the state has to
// be cleared explicitly — called on successful submit and on explicit
// "Annulla", but deliberately NOT on the X button or an outside click, which
// should preserve whatever the user typed (user decision 2026-08-20).
function resetForm() {
  Object.assign(state, createInitialState())
  resetStartDate()
  image.value = undefined
  state.organizerUuid = organizerOptions.value.find(option => option.label === 'Pauperwave')?.value
    ?? state.organizerUuid
  state.locationUuid = locationOptions.value.find(option => option.label.startsWith('Smart Lab'))?.value
}

// fallow-ignore-next-line code-duplication -- the state literal + onSubmit
// scaffolding mirror leagues/list/AddModal.vue's, but the payload type/fields
// (NewEventPayload vs NewLeaguePayload) and mutation differ per domain — same
// same-shaped-but-parameterized call as feedback_dedup_threshold_call_sites.
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const startsAt = combineDateAndTime(startDate.value!, event.data.startTime)
  const endsAt = event.data.endTime
    ? combineEndDateAndTime(startsAt, startDate.value!, event.data.endTime)
    : null

  const payload: NewEventPayload = {
    name: event.data.name ?? '',
    status: event.data.status,
    locationUuid: event.data.locationUuid || null,
    organizerUuid: event.data.organizerUuid ?? '',
    startsAt: startsAt.toISOString(),
    endsAt: endsAt ? endsAt.toISOString() : null,
    companionCode: event.data.companionCode || null,
    imageUrl: image.value ?? null
  }

  try {
    await createEvent.mutateAsync(payload)
    toast.add({
      title: t('event.addModal.successToastTitle'),
      description: t('event.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
    resetForm()
  } catch (err) {
    toast.add({
      title: t('event.addModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-xl' }"
    :title="$t('event.addModal.title')"
    :description="$t('event.addModal.description')"
  >
    <AddButton
      :label="$t('event.addModal.openButton')"
      :icon="ICONS.calendarAdd"
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
            {{ $t('event.addModal.eventData') }}
          </p>

          <UFormField :label="$t('league.addModal.fields.image')" name="image">
            <MagicCardArtPicker v-model="image" />
          </UFormField>

          <div class="flex justify-between gap-2">
            <div class="flex-1">
              <UStatusSelect
                v-model="state.status"
                :items="statusOptions"
                name="status"
                :label="$t('event.addModal.fields.status')"
                class="w-full"
              />
            </div>

            <UFormField
              :label="$t('event.addModal.fields.companionCode')"
              name="companionCode"
            >
              <UInput
                :model-value="state.companionCode ?? ''"
                :placeholder="$t('event.addModal.fields.companionCodePlaceholder')"
                :icon="ICONS.smartphone"
                class="w-42"
                @update:model-value="state.companionCode = ($event as string) || undefined"
              />
            </UFormField>
          </div>

          <!-- eslint-disable-next-line -->
          <UFormField :label="$t('event.addModal.fields.name')" name="name" required>
            <UInput
              v-model="state.name"
              class="w-full"
              :placeholder="$t('event.addModal.fields.namePlaceholder')"
              :icon="ICONS.calendar"
            />
          </UFormField>

          <p class="text-lg font-semibold text-primary">
            {{ $t('event.addModal.scheduling') }}
          </p>

          <EventsFieldsSchedulingFields
            v-model:start-date="startDate"
            :state="state"
            :formatted-start-date="formattedStartDate"
          />

          <p class="text-lg font-semibold text-primary">
            {{ $t('event.addModal.organizerData') }}
          </p>

          <div class="grid grid-cols-2 gap-2">
            <!-- eslint-disable-next-line -->
            <UFormField
              :label="$t('event.addModal.fields.organizer')"
              name="organizerUuid"
              required
            >
              <USelectMenu
                v-model="state.organizerUuid"
                class="w-full"
                :items="organizerOptions"
                value-key="value"
                :placeholder="$t('event.addModal.fields.selectOrganizer')"
                :icon="ICONS.player"
              />
            </UFormField>

            <UFormField
              :label="$t('event.addModal.fields.location')"
              name="locationUuid"
            >
              <USelectMenu
                v-model="state.locationUuid"
                class="w-full"
                :items="locationOptions"
                value-key="value"
                :placeholder="$t('event.addModal.fields.selectLocation')"
                :icon="ICONS.mapPin"
              />
            </UFormField>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('event.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false; resetForm()"
          />
          <UButton
            :label="$t('event.addModal.create')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="createEvent.isLoading.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
