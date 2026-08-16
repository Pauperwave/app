<!-- app\components\locations\list\OpeningHoursEditor.vue -->
<script setup lang="ts">
import { parseTime } from '@internationalized/date'
import type { TimeValue } from 'reka-ui'
import type { DayOfWeek, OpeningHours } from '~/types'

const model = defineModel<OpeningHours>({ default: emptyOpeningHours })

// Set when the location is temporarily closed (see AddModal.vue/EditModal.vue)
// — grays out every row without touching `model`, so the configured hours
// stay intact for whenever the location reopens.
const { disabled = false } = defineProps<{ disabled?: boolean }>()

const { t } = useI18n()

// Kept alongside `model` so a day's pickers stay populated (and rendered)
// even while closed — model[day] is null for a closed day, but the row
// shouldn't collapse/grow when toggling, and the previously entered times
// shouldn't be lost if the user unchecks and rechecks the day.
const draft = reactive<Record<DayOfWeek, { open: string, close: string }>>(
  Object.fromEntries(
    DAYS_OF_WEEK.map(day => [day, model.value[day] ?? { open: '09:00', close: '18:00' }])
  ) as Record<DayOfWeek, { open: string, close: string }>
)

watch(model, (current) => {
  for (const day of DAYS_OF_WEEK) {
    if (current[day]) draft[day] = { ...current[day] }
  }
})

function toggleDay(day: DayOfWeek, isOpen: boolean) {
  if (isOpen) {
    // Copy the previous day's hours when turning a day on, so a run of
    // identical days (e.g. Tue-Fri) doesn't need re-entering each time.
    const previousDay = DAYS_OF_WEEK[DAYS_OF_WEEK.indexOf(day) - 1]
    const previousHours = previousDay ? model.value[previousDay] : null
    if (previousHours) draft[day] = { ...previousHours }
  }

  model.value = {
    ...model.value,
    [day]: isOpen ? { ...draft[day] } : null
  }
}

// Two independent (non-range) pickers rather than UInputTime's `range` mode:
// range mode treats start/end as the same calendar day and flags close < open
// (e.g. 17:00 -> 00:00, a venue closing after midnight) as invalid, since Time
// values carry no day component to express "closes the next day".
function updateTime(day: DayOfWeek, key: 'open' | 'close', value: TimeValue | null | undefined) {
  if (!value) return
  // TimeValue.toString() is "HH:mm:ss" — opening_hours only ever stores "HH:mm".
  draft[day] = { ...draft[day], [key]: value.toString().slice(0, 5) }
  if (model.value[day]) model.value = { ...model.value, [day]: { ...draft[day] } }
}
</script>

<template>
  <div class="space-y-2" :class="{ 'opacity-50 pointer-events-none': disabled }">
    <div
      v-for="day in DAYS_OF_WEEK"
      :key="day"
      class="flex items-center gap-3"
    >
      <UCheckbox
        :model-value="!!model[day]"
        :disabled="disabled"
        class="w-28 shrink-0"
        :label="t(`location.days.${day}`)"
        @update:model-value="toggleDay(day, !!$event)"
      />

      <UInputTime
        :range="false"
        :hour-cycle="24"
        :disabled="disabled || !model[day]"
        :model-value="parseTime(draft[day].open)"
        @update:model-value="updateTime(day, 'open', $event)"
      />
      <UIcon name="i-lucide-arrow-right" class="text-muted shrink-0" />
      <UInputTime
        :range="false"
        :hour-cycle="24"
        :disabled="disabled || !model[day]"
        :model-value="parseTime(draft[day].close)"
        @update:model-value="updateTime(day, 'close', $event)"
      />
    </div>
  </div>
</template>
