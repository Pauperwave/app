<!-- app\components\events\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewEventPayload } from '#shared/types/events'
import type { EventFormState } from '~/composables/events/useEventFormFields'
import type { Event } from '~/types'
import type { EventPartnerInput } from '#shared/utils/events/eventPartners'

const open = defineModel<boolean>({ default: false })

// sourceEvent is the "Copia evento" context-menu action, like TournamentsListAddModal.vue's
// sourceTournament: copies every field except status (reset to draft). No dates: an event is a
// folder of tournaments and its dates come from them (derivedDates.ts). hideTrigger mirrors that
// component too: this instance is opened programmatically by the copy action, not its own AddButton
const { sourceEvent, hideTrigger = false } = defineProps<{
  sourceEvent?: Event | null
  hideTrigger?: boolean
}>()

const toast = useToast()
const { t } = useI18n()

// Locations/organizations come from the real `events` table's lookups, see
// useLocationsQuery.ts/useOrganizationsQuery.ts (shared with tournaments' AddModal.vue)
const { createEvent } = useEventsMutations()
const {
  schema, statusOptions, locationOptions, organizerOptions
} = useEventFormFields()

function createInitialState(): EventFormState {
  const source = sourceEvent
  return {
    name: source?.name,
    status: 'draft',
    // A copy keeps everything but the edition and the tickets' on-sale day (they belong to the
    // original).
    tagline: source?.tagline ?? undefined,
    description: source?.description ?? undefined,
    practicalNotes: source?.practicalNotes ?? undefined,
    ticketsUrl: source?.ticketsUrl ?? undefined,
    membershipRequired: source?.membershipRequired ?? false,
    membershipUrl: source?.membershipUrl ?? undefined,
    organizerUuid: source?.organizerUuid ?? undefined as unknown as string,
    locationUuid: source?.locationUuid ?? undefined,
    companionCode: source?.companionCode ?? undefined
  }
}

const state = reactive<EventFormState>(createInitialState())

// A list, not a schema field: kept out of `state` like the image.
function initialPartners(): EventPartnerInput[] {
  return (sourceEvent?.partners ?? []).map(partner => ({ ...partner }))
}
const partners = ref<EventPartnerInput[]>(initialPartners())

// Nearly every event created here is organized by Pauperwave at Smart Lab: the same defaulting as
// TournamentsListAddModal.vue, applied once each list resolves (async, via
// useOrganizationsQuery/useLocationsQuery) and only if the field is still empty so a manual choice
// made before the lists loaded is never overridden. `startsWith` for the location: its display name
// is "Smart Lab - Centro Giovani Rovereto" (see the locations seed migration)
watch(organizerOptions, (options) => {
  if (state.organizerUuid) return
  state.organizerUuid = options.find(option => option.label === 'Pauperwave')?.value
}, { immediate: true })
watch(locationOptions, (options) => {
  if (state.locationUuid) return
  state.locationUuid = options.find(option => option.label.startsWith('Smart Lab'))?.value
}, { immediate: true })

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as TournamentsListAddModal.vue's `image`/`imageCardName`/
// `imageCardArtist`.
const image = ref<string | undefined>(undefined)
const imageCardName = ref<string | undefined>(undefined)
const imageCardArtist = ref<string | undefined>(undefined)

// Re-applies sourceEvent every time the modal opens, not just on mount (like
// TournamentsListAddModal.vue's watch(open, ...)): this instance is reused across different "Copia
// evento" clicks while it stays alive
watch(open, (isOpen) => {
  if (!isOpen || !sourceEvent) return
  Object.assign(state, createInitialState())
  partners.value = initialPartners()
  image.value = sourceEvent.image ?? undefined
  imageCardName.value = sourceEvent.imageCardName ?? undefined
  imageCardArtist.value = sourceEvent.imageCardArtist ?? undefined
})

type Schema = v.InferOutput<typeof schema>

// UModal only hides/shows and doesn't unmount the form, so the state is cleared explicitly: on
// successful submit and "Annulla", deliberately NOT on the X button or an outside click, which
// preserve what the user typed
function resetForm() {
  Object.assign(state, createInitialState())
  partners.value = initialPartners()
  image.value = undefined
  imageCardName.value = undefined
  imageCardArtist.value = undefined
  state.organizerUuid = organizerOptions.value.find(option => option.label === 'Pauperwave')?.value
    ?? state.organizerUuid
  state.locationUuid = locationOptions.value.find(option => option.label.startsWith('Smart Lab'))?.value
}

// fallow-ignore-next-line code-duplication -- see the same comment in leagues/list/AddModal.vue
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const payload: NewEventPayload = {
    name: event.data.name ?? '',
    status: event.data.status,
    locationUuid: event.data.locationUuid || null,
    organizerUuid: event.data.organizerUuid ?? '',
    companionCode: event.data.companionCode || null,
    tagline: event.data.tagline || null,
    edition: event.data.edition ?? null,
    description: event.data.description || null,
    practicalNotes: event.data.practicalNotes || null,
    ticketsUrl: event.data.ticketsUrl || null,
    ticketsOnSaleOn: event.data.ticketsOnSaleOn || null,
    membershipRequired: event.data.membershipRequired ?? false,
    membershipUrl: event.data.membershipRequired ? (event.data.membershipUrl || null) : null,
    partners: partners.value,
    imageUrl: image.value ?? null,
    imageCardName: imageCardName.value ?? null,
    imageCardArtist: imageCardArtist.value ?? null
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
      v-if="!hideTrigger"
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
            <MagicCardArtPicker
              v-model="image"
              v-model:card-name="imageCardName"
              v-model:artist="imageCardArtist"
            />
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

          <EventsFieldsDetailFields v-model:partners="partners" :state="state" />

          <p class="text-lg font-semibold text-primary">
            {{ $t('event.addModal.organizerData') }}
          </p>

          <div class="grid grid-cols-2 gap-2">
            <!-- eslint-disable-next-line -->
            <!-- fallow-ignore-next-line code-duplication -- see EditModal.vue -->
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
