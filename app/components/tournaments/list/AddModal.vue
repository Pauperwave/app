<!-- app\components\tournaments\list\AddModal.vue -->
<script setup lang="ts">
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewTournamentPayload } from '#shared/types/tournaments'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// Migrated off hardcoded option arrays onto the real lookup tables
// (2026-08-15) — locations/organizations/mtg_formats, see
// useLocationsQuery.ts/useOrganizationsQuery.ts/useMtgFormatsQuery.ts.
// `visibility`/`ruleset` dropped entirely: neither is a real tournaments
// column, they only ever existed in the mock form. League/event linking
// dropped too — leagues and events are still mock data, not migrated yet
// (see docs/BACKLOG.md), so there's nothing real to link to.
const { data: locations } = useLocationsQuery()
const { data: organizations } = useOrganizationsQuery()
const { data: formats } = useMtgFormatsQuery()
const { createTournament } = useTournamentsMutations()

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

const today = new Date()
const todayString = today.toISOString().substring(0, 10)

const schema = v.object({
  status: v.picklist(TOURNAMENT_STATUSES),
  companionCode: v.optional(v.nullable(v.string())),
  // .optional() here mirrors the pre-migration schema: "name" shows as
  // "required" in the UI (see UFormField required) but the validation schema
  // does not enforce it — a pre-existing inconsistency, left as is.
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

type Schema = v.InferOutput<typeof schema>

const state = reactive<Schema>({
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
  const [hours, minutes] = event.data.startTime.split(':').map(Number)
  const startsAt = new CalendarDate(
    startDate.value!.year, startDate.value!.month, startDate.value!.day
  ).toDate(getLocalTimeZone())
  startsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0)

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

          <div class="flex justify-between gap-2">
            <UFormField :label="$t('tournament.addModal.fields.status')" class="flex-1" name="status">
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
              :label="$t('tournament.addModal.fields.companionCode')"
              name="companionCode"
            >
              <UInput
                :model-value="state.companionCode ?? ''"
                :placeholder="$t('tournament.addModal.fields.companionCodePlaceholder')"
                :icon="ICONS.smartphone"
                class="w-42"
                @update:model-value="state.companionCode = ($event as string) || undefined"
              />
            </UFormField>
          </div>

          <div class="flex items-end gap-2">
            <!-- eslint-disable-next-line -->
            <UFormField :label="$t('tournament.addModal.fields.name')" name="name" class="flex-1" required>
              <UInput
                v-model="state.name"
                class="w-full"
                :placeholder="$t('tournament.addModal.fields.namePlaceholder')"
                :icon="ICONS.standings"
              />
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.entryFee')" name="entryFee">
              <UInputNumber
                v-model="state.entryFee"
                :min="0"
                :step="5"
                class="w-42"
                :icon="ICONS.euro"
              />
            </UFormField>
          </div>

          <UFormField :label="$t('tournament.addModal.fields.description')" name="description">
            <UTextarea
              :model-value="state.description ?? ''"
              class="w-full"
              :placeholder="$t('tournament.addModal.fields.descriptionPlaceholder')"
              :icon="ICONS.alignLeft"
              @update:model-value="state.description = ($event as string) || undefined"
            />
          </UFormField>

          <UFormField :label="$t('tournament.addModal.fields.prizes')" name="prizes">
            <UInput
              :model-value="state.prizes ?? ''"
              class="w-full"
              :placeholder="$t('tournament.addModal.fields.prizesPlaceholder')"
              :icon="ICONS.euro"
              @update:model-value="state.prizes = ($event as string) || undefined"
            />
          </UFormField>

          <UFormField :label="$t('tournament.addModal.fields.format')" name="formatUuid">
            <USelectMenu
              v-model="state.formatUuid"
              class="w-full"
              :items="formatOptions"
              value-key="value"
              :placeholder="$t('tournament.addModal.fields.selectFormat')"
              :icon="ICONS.layers"
            />
          </UFormField>

          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.scheduling') }}
          </p>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex justify-between gap-2">
              <UFormField :label="$t('tournament.addModal.fields.startDate')" class="flex-1" name="startDate">
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

              <UFormField :label="$t('tournament.addModal.fields.startTime')" name="startTime">
                <UTimePicker
                  v-model="state.startTime"
                  :placeholder="$t('tournament.addModal.fields.selectTime')"
                  :minute-step="15"
                />
              </UFormField>
            </div>

            <UFormField :label="$t('tournament.addModal.fields.roundCount')" name="roundCount">
              <UInputNumber
                v-model="state.roundCount"
                :min="1"
                :icon="ICONS.hash"
              />
            </UFormField>
          </div>

          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.organizerData') }}
          </p>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('tournament.addModal.fields.organizer')" name="organizerUuid">
              <USelectMenu
                v-model="state.organizerUuid"
                class="w-full"
                :items="organizerOptions"
                value-key="value"
                :placeholder="$t('tournament.addModal.fields.selectOrganizer')"
                :icon="ICONS.player"
              />
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.location')" name="locationUuid">
              <USelectMenu
                v-model="state.locationUuid"
                class="w-full"
                :items="locationOptions"
                value-key="value"
                :placeholder="$t('tournament.addModal.fields.selectLocation')"
                :icon="ICONS.mapPin"
              />
            </UFormField>
          </div>
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
