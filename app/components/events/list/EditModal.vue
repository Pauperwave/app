<!-- app\components\events\list\EditModal.vue -->
<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Event } from '~/types'
import type { NewEventPayload } from '#shared/types/events'
import type { EventFormState } from '~/composables/events/useEventFormFields'

const open = defineModel<boolean>({ default: false })
const { event: editingEvent } = defineProps<{ event: Event | null }>()

const toast = useToast()
const { t } = useI18n()
const { updateEvent } = useEventsMutations()

// Same shape as AddModal.vue's initial state — same reasoning as
// TournamentsListEditModal.vue's own state literal.
const state = reactive<EventFormState>({
  name: undefined,
  status: 'draft',
  startDate: undefined,
  startTime: undefined,
  endTime: undefined,
  organizerUuid: undefined,
  locationUuid: undefined,
  companionCode: undefined
})

const { startDate, formattedStartDate } = useStartDateField(state, { defaultToToday: false })

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as TournamentsListEditModal.vue's `image`. No card-name/
// artist attribution pair here (unlike tournaments/leagues): the `events`
// table has no image_card_name/image_card_artist columns.
const image = ref<string | undefined>(undefined)

// Refills every time the modal opens on a (possibly new) event — same
// convention as TournamentsListEditModal.vue's watch on its `tournament` prop.
watch([open, () => editingEvent], ([isOpen, current]) => {
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
  state.organizerUuid = current.organizerUuid
  state.locationUuid = current.locationUuid ?? undefined
  state.companionCode = current.companionCode ?? undefined
  image.value = current.image ?? undefined
}, { immediate: true })

const {
  schema, statusOptions, locationOptions, organizerOptions
} = useEventFormFields()

type Schema = v.InferOutput<typeof schema>

const submitting = ref(false)

async function onSubmit(formEvent: FormSubmitEvent<Schema>) {
  if (!editingEvent) return

  const startsAt = combineDateAndTime(startDate.value!, formEvent.data.startTime)
  const endsAt = formEvent.data.endTime
    ? combineEndDateAndTime(startsAt, startDate.value!, formEvent.data.endTime)
    : null

  const payload: NewEventPayload = {
    name: formEvent.data.name ?? '',
    status: formEvent.data.status,
    locationUuid: formEvent.data.locationUuid || null,
    organizerUuid: formEvent.data.organizerUuid ?? '',
    startsAt: startsAt.toISOString(),
    endsAt: endsAt ? endsAt.toISOString() : null,
    companionCode: formEvent.data.companionCode || null,
    imageUrl: image.value ?? null
  }

  submitting.value = true
  try {
    await updateEvent.mutateAsync({ id: editingEvent.id, edits: payload })
    toast.add({
      title: t('event.editModal.successToastTitle'),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('event.editModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-xl' }"
    :title="$t('event.editModal.title')"
  >
    <template #body>
      <UForm
        v-if="editingEvent"
        :schema="schema"
        :state="state"
        class="space-y-2"
        @submit="onSubmit"
      >
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

          <UFormField :label="$t('event.addModal.fields.companionCode')" name="companionCode">
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

        <EventsFieldsSchedulingFields
          v-model:start-date="startDate"
          :state="state"
          :formatted-start-date="formattedStartDate"
        />

        <div class="grid grid-cols-2 gap-2">
          <!-- eslint-disable-next-line -->
          <!-- fallow-ignore-next-line code-duplication -- see AddModal.vue -->
          <UFormField :label="$t('event.addModal.fields.organizer')" name="organizerUuid" required>
            <USelectMenu
              v-model="state.organizerUuid"
              class="w-full"
              :items="organizerOptions"
              value-key="value"
              :placeholder="$t('event.addModal.fields.selectOrganizer')"
              :icon="ICONS.player"
            />
          </UFormField>

          <UFormField :label="$t('event.addModal.fields.location')" name="locationUuid">
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

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('event.editModal.cancel')"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('event.editModal.save')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
