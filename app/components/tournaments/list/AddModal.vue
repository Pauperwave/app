<!-- app\components\tournaments\list\AddModal.vue -->
<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const visibilityOptions = computed(() => [
  { value: 'public', label: t('tournament.addModal.visibilityOptions.public'), icon: ICONS.show },
  { value: 'private', label: t('tournament.addModal.visibilityOptions.private'), icon: ICONS.hide }
])

const statusOptions = computed(() => [
  { value: 'scheduled', label: t('tournament.addModal.statusOptions.scheduled'), icon: ICONS.clock, color: 'info' },
  { value: 'cancelled', label: t('tournament.addModal.statusOptions.cancelled'), icon: ICONS.clear, color: 'error' },
  { value: 'ongoing', label: t('tournament.addModal.statusOptions.ongoing'), icon: ICONS.pending, color: 'warning' },
  { value: 'completed', label: t('tournament.addModal.statusOptions.completed'), icon: ICONS.successFilledBig, color: 'success' }
])

const formatOptions = [
  'Standard',
  'Modern',
  'Pioneer',
  'Commander',
  'Legacy',
  'Vintage',
  'Pauper'
]

const organizerOptions = [
  'Magman',
  'Pauperwave',
  'Commanderwave',
  'MagicCorner'
]

const placeOptions = [
  'Magazzino Fantasia',
  'Bruno',
  'Magman'
]

const rulesetOptions = [
  'REL Regular',
  'REL Competitive',
  'REL Professional'
]

const leagueOptions = [
  'Magman Autunno 2025',
  'Magman Primavera 2025',
  'Magman Estate 2025',
  'Magman Inverno 2025'
]

const eventOptions = [
  'CommanderFest',
  'CommanderFest Summer'
]

// Get today's date
const today = new Date()
const todayString = today.toISOString().substring(0, 10) // Format as YYYY-MM-DD

// Custom messages only on the free-text/numeric fields (name, entry_fee,
// round_count, round_duration) — the others are constrained selects with an
// already valid default, so no user state can ever make them invalid.
const schema = v.object({
  status: v.string(),
  visibility: v.string(),
  companion_code: v.optional(v.nullable(v.string())),
  // .optional() here mirrors the original Zod schema: "name" shows as "required"
  // in the UI (see UFormField required) but the validation schema does not enforce
  // it — a pre-existing inconsistency, not introduced by this migration, left as
  // is so behaviour does not change.
  name: v.optional(v.string(t('tournament.addModal.validation.nameRequired'))),
  description: v.optional(v.nullable(v.string())),
  entry_fee: v.pipe(v.number(), v.minValue(0, t('tournament.addModal.validation.entryFeeNegative'))),
  prizes: v.optional(v.nullable(v.string())),
  format: v.string(),
  ruleset: v.string(),
  start_date: v.string(),
  start_time: v.string(),
  round_count: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1, t('tournament.addModal.validation.roundCountPositive'))
  ),
  round_duration: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1, t('tournament.addModal.validation.roundDurationPositive'))
  ),
  organizer: v.string(),
  location: v.string(),
  league: v.optional(v.string()),
  event: v.optional(v.string())
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Schema>({
  name: undefined,
  ruleset: 'REL Regular',
  status: 'scheduled',
  start_date: todayString,
  visibility: 'private',
  start_time: '20:00',
  round_count: 2,
  round_duration: 60,
  league: undefined,
  event: undefined,
  format: 'Commander',
  description: undefined,
  prizes: undefined,
  organizer: 'Pauperwave',
  location: 'Magazzino Fantasia',
  entry_fee: 5,
  companion_code: undefined
})

// Initialize CalendarDate from today - use shallowRef with proper type
const startDate = shallowRef<DateValue>(
  new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
)

// Watch for changes to startDate and update state.start_date
watch(startDate, (newDate) => {
  if (newDate) {
    // Format as YYYY-MM-DD
    state.start_date = `${newDate.year}-${String(newDate.month).padStart(2, '0')}-${String(newDate.day).padStart(2, '0')}`
  }
})

const formattedStartDate = computed(() => {
  if (!startDate.value) return ''
  const date = new Date(startDate.value.year, startDate.value.month - 1, startDate.value.day)
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
})

// Computed property to get the selected visibility object
const selectedVisibility = computed(() => {
  return visibilityOptions.value.find(option => option.value === state.visibility)
})

// Computed property to get the selected status object
const selectedStatus = computed(() => {
  return statusOptions.value.find(option => option.value === state.status)
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Show success toast
  toast.add({
    title: t('tournament.addModal.successToastTitle'),
    description: t('tournament.addModal.successToastDescription', { name: event.data.name }),
    color: 'success'
  })

  // Close modal
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
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
        <!-- Dati relativi all'evento -->
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

            <UFormField :label="$t('tournament.addModal.fields.visibility')" class="flex-1" name="visibility">
              <USelect
                v-model="state.visibility"
                :items="visibilityOptions"
                value-key="value"
                class="w-full"
              >
                <template #leading>
                  <UIcon v-if="selectedVisibility" :name="selectedVisibility.icon" class="size-5 shrink-0" />
                </template>
              </USelect>
            </UFormField>

            <UFormField
              :label="$t('tournament.addModal.fields.companionCode')"
              name="companion_code"
            >
              <UInput
                :model-value="state.companion_code ?? ''"
                :placeholder="$t('tournament.addModal.fields.companionCodePlaceholder')"
                :icon="ICONS.smartphone"
                class="w-42"
                @update:model-value="state.companion_code = ($event as string) || undefined"
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

            <UFormField :label="$t('tournament.addModal.fields.entryFee')" name="entry_fee">
              <UInputNumber
                v-model="state.entry_fee"
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

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('tournament.addModal.fields.format')" name="format">
              <USelectMenu
                v-model="state.format"
                class="w-full"
                :items="formatOptions"
                :placeholder="$t('tournament.addModal.fields.selectFormat')"
                :icon="ICONS.layers"
              />
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.ruleset')" name="ruleset">
              <USelect
                v-model="state.ruleset"
                class="w-full"
                :items="rulesetOptions"
                :placeholder="$t('tournament.addModal.fields.selectRuleset')"
                :icon="ICONS.bookOpen"
              />
            </UFormField>
          </div>

          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.scheduling') }}
          </p>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex justify-between gap-2">
              <UFormField :label="$t('tournament.addModal.fields.startDate')" class="flex-1" name="start_date">
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

              <UFormField :label="$t('tournament.addModal.fields.startTime')" name="start_time">
                <UTimePicker
                  v-model="state.start_time"
                  :placeholder="$t('tournament.addModal.fields.selectTime')"
                  :minute-step="15"
                />
              </UFormField>
            </div>

            <div class="flex gap-2">
              <UFormField :label="$t('tournament.addModal.fields.roundCount')" name="round_count">
                <UInputNumber
                  v-model="state.round_count"
                  :min="1"
                  :icon="ICONS.hash"
                />
              </UFormField>

              <UFormField
                :label="$t('tournament.addModal.fields.roundDuration')"
                name="round_duration"
              >
                <UInputNumber
                  v-model="state.round_duration"
                  :step="5"
                  :icon="ICONS.timer"
                />
              </UFormField>
            </div>
          </div>

          <!-- Organizer details -->
          <p class="text-lg font-semibold text-primary">
            {{ $t('tournament.addModal.organizerData') }}
          </p>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('tournament.addModal.fields.organizer')" name="organizer">
              <USelect
                v-model="state.organizer"
                class="w-full"
                :items="organizerOptions"
                :placeholder="$t('tournament.addModal.fields.selectOrganizer')"
                :icon="ICONS.player"
              />
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.location')" name="location">
              <USelect
                v-model="state.location"
                class="w-full"
                :items="placeOptions"
                :placeholder="$t('tournament.addModal.fields.selectLocation')"
                :icon="ICONS.mapPin"
              />
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.league')" name="league">
              <USelectMenu
                v-model="state.league"
                class="w-full"
                :items="leagueOptions"
                :placeholder="$t('tournament.addModal.fields.linkLeague')"
                :icon="ICONS.standings"
              >
                <template #trailing>
                  <UButton
                    v-if="state.league"
                    class="cursor-pointer"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :icon="ICONS.clear"
                    @click="state.league = ''"
                  />
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.event')" name="event">
              <USelectMenu
                v-model="state.event"
                class="w-full"
                :items="eventOptions"
                :placeholder="$t('tournament.addModal.fields.linkEvent')"
                :icon="ICONS.calendarRenew"
              >
                <template #trailing>
                  <UButton
                    v-if="state.event"
                    class="cursor-pointer"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :icon="ICONS.clear"
                    @click="state.event = ''"
                  />
                </template>
              </USelectMenu>
            </UFormField>
          </div>
        </div>

        <!-- Action buttons -->
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
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
