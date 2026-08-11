<!-- app\components\associates\fields\BirthInfoFields.vue -->
<!--
  Shared by AddModal.vue and /tesseramento — see PersonalInfoFields.vue for
  the state-mutation rationale (same pattern, `vue/no-mutating-props`
  disabled below for the same reason).
-->
<!-- eslint-disable vue/no-mutating-props -- see PersonalInfoFields.vue -->
<script setup lang="ts">
import { format } from 'date-fns'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'

// AddModal.vue's state is a full Schema; /tesseramento's is a Partial<Schema>
// (fields start undefined until the user reaches that step) — the union
// covers both without either file casting.
interface BirthInfoState {
  born_location?: string
  born_date?: Date
  born_province?: string
  born_state?: string
}

const { state } = defineProps<{ state: BirthInfoState }>()

const calendarDate = computed<CalendarDate | null>({
  get: () => state.born_date
    ? new CalendarDate(
      state.born_date.getFullYear(), state.born_date.getMonth() + 1, state.born_date.getDate()
    )
    : null,
  set: (newDate) => {
    state.born_date = newDate ? newDate.toDate(getLocalTimeZone()) : undefined
  }
})

function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField :label="$t('associate.addModal.fields.birthLocation')" name="born_location" required>
    <UInput
      v-model="state.born_location"
      :placeholder="$t('associate.addModal.placeholders.birthLocation')"
      class="w-full"
    />
  </UFormField>

  <UFormField :label="$t('associate.addModal.fields.birthDate')" name="born_date" required>
    <!-- Hidden input for autofill and schema validation — the visible control
         below is a UButton+UCalendar, not a native input browsers can
         autofill on their own. -->
    <input
      v-model="state.born_date"
      type="date"
      name="born_date"
      autocomplete="bday"
      class="hidden"
    >
    <UPopover>
      <UButton
        color="neutral"
        variant="outline"
        class="w-full justify-start"
        :icon="ICONS.calendar"
      >
        {{ state.born_date
          ? formatDate(state.born_date)
          : $t('associate.addModal.fields.selectBirthDate') }}
      </UButton>

      <template #content>
        <UCalendar
          v-model="calendarDate"
          :default-value="new CalendarDate(1995, 1, 1)"
          class="p-2"
        />
      </template>
    </UPopover>
  </UFormField>

  <UFormField :label="$t('associate.addModal.fields.birthProvince')" name="born_province" required>
    <UInput
      v-model="state.born_province"
      :placeholder="$t('associate.addModal.placeholders.birthProvince')"
      class="w-full"
    />
  </UFormField>
  <UFormField :label="$t('associate.addModal.fields.birthState')" name="born_state" required>
    <UInput
      v-model="state.born_state"
      :placeholder="$t('associate.addModal.placeholders.birthState')"
      class="w-full"
    />
  </UFormField>
</template>
