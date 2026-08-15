<!-- app\components\events\list\AddModal.vue -->
<script setup lang="ts">
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewEventPayload } from '#shared/types/events'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// Migrated off the name/email placeholder stub onto the real `events` table
// (2026-08-15) — locations/organizations, see
// useLocationsQuery.ts/useOrganizationsQuery.ts (shared with tournaments'
// AddModal.vue).
const { data: locations } = useLocationsQuery()
const { data: organizations } = useOrganizationsQuery()
const { createEvent } = useEventsMutations()

const statusOptions = computed(() => EVENT_STATUSES.map(status => ({
  value: status,
  label: t(`event.addModal.statusOptions.${status}`),
  icon: EVENT_STATUS_ICONS[status],
  color: eventStatusColor(status)
})))

const locationOptions = computed(() => (locations.value ?? []).map(location => ({
  value: location.uuid, label: location.name
})))
const organizerOptions = computed(() => (organizations.value ?? []).map(organization => ({
  value: organization.uuid, label: organization.name
})))

const today = new Date()
const todayString = today.toISOString().substring(0, 10)

const schema = v.object({
  status: v.picklist(EVENT_STATUSES),
  companionCode: v.optional(v.nullable(v.string())),
  name: v.pipe(v.string(), v.minLength(1, t('event.addModal.validation.nameRequired'))),
  startDate: v.string(),
  organizerUuid: v.string(t('event.addModal.validation.nameRequired')),
  locationUuid: v.optional(v.string())
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Schema>({
  name: '',
  status: 'draft',
  startDate: todayString,
  organizerUuid: undefined as unknown as string,
  locationUuid: undefined,
  companionCode: undefined
})

const startDate = shallowRef<DateValue>(
  new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
)

watch(startDate, (newDate) => {
  if (newDate) {
    state.startDate = `${newDate.year}-${String(newDate.month).padStart(2, '0')}-${String(newDate.day).padStart(2, '0')}`
  }
})

const formattedStartDate = computed(() => {
  if (!startDate.value) return ''
  const date = new Date(startDate.value.year, startDate.value.month - 1, startDate.value.day)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
})

const selectedStatus = computed(() =>
  statusOptions.value.find(option => option.value === state.status))

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const startsAt = new CalendarDate(
    startDate.value!.year, startDate.value!.month, startDate.value!.day
  ).toDate(getLocalTimeZone())

  const payload: NewEventPayload = {
    name: event.data.name,
    status: event.data.status,
    locationUuid: event.data.locationUuid || null,
    organizerUuid: event.data.organizerUuid,
    startsAt: startsAt.toISOString(),
    endsAt: null,
    companionCode: event.data.companionCode || null
  }

  try {
    await createEvent.mutateAsync(payload)
    toast.add({
      title: t('event.addModal.successToastTitle'),
      description: t('event.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
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
    :dismissible="false"
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
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="space-y-4">
          <p class="text-lg font-semibold text-primary">
            {{ $t('event.addModal.eventData') }}
          </p>

          <div class="flex justify-between gap-2">
            <UFormField :label="$t('event.addModal.fields.status')" class="flex-1" name="status">
              <USelect
                v-model="state.status"
                :items="statusOptions"
                value-key="value"
                class="w-full"
              >
                <template #leading>
                  <UIcon v-if="selectedStatus" :name="selectedStatus.icon" class="size-5 shrink-0" />
                </template>
              </USelect>
            </UFormField>

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

          <UFormField :label="$t('event.addModal.fields.startDate')" name="startDate">
            <UPopover>
              <UInput
                :model-value="formattedStartDate"
                readonly
                class="w-full"
                :icon="ICONS.calendar"
              />

              <template #content>
                <UCalendar v-model="startDate" class="p-2" />
              </template>
            </UPopover>
          </UFormField>

          <p class="text-lg font-semibold text-primary">
            {{ $t('event.addModal.organizerData') }}
          </p>

          <div class="grid grid-cols-2 gap-4">
            <!-- eslint-disable-next-line -->
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
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('event.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
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
