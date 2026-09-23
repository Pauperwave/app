<!-- app\components\settings\TimerSettingsForm.vue -->
<!--
  /settings' "Timer" section — split out of TournamentSettingsForm.vue
  (2026-09-23 user request): the round timer's own duration values (round
  duration per format family, plus the "pre" SISTEMATEVI countdown length),
  kept apart from the round-count/Swiss-tier values in the "Tornei" section.
-->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()

const settings = useSettingsQuery()
const { updateTimerSettings } = useSettingsMutations()

const minutesSchema = v.pipe(
  v.number(t('settings.timer.validation.minutes')),
  v.integer(t('settings.timer.validation.minutes')),
  v.minValue(10, t('settings.timer.validation.minutes')),
  v.maxValue(120, t('settings.timer.validation.minutes'))
)
const preRoundWaitSchema = v.pipe(
  v.number(t('settings.timer.validation.preRoundWaitMinutes')),
  v.integer(t('settings.timer.validation.preRoundWaitMinutes')),
  v.minValue(0, t('settings.timer.validation.preRoundWaitMinutes')),
  v.maxValue(30, t('settings.timer.validation.preRoundWaitMinutes'))
)

const schema = v.object({
  commanderRoundMinutes: minutesSchema,
  oneVsOneRoundMinutes: minutesSchema,
  preRoundWaitMinutes: preRoundWaitSchema
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({
  commanderRoundMinutes: undefined,
  oneVsOneRoundMinutes: undefined,
  preRoundWaitMinutes: undefined
})

const { isDirty, markSaved } = useDirtyFormSnapshot(state)

// Fills the form once, the first time the query resolves — not a continuous
// sync, which would clobber an in-progress edit on a window-refocus refetch.
watch(settings.data, (data) => {
  if (!data || state.commanderRoundMinutes !== undefined) return
  state.commanderRoundMinutes = data.commanderRoundMinutes
  state.oneVsOneRoundMinutes = data.oneVsOneRoundMinutes
  state.preRoundWaitMinutes = data.preRoundWaitMinutes
  markSaved()
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await updateTimerSettings.mutateAsync(event.data)
    markSaved()
    toast.add({
      title: t('settings.timer.successToastTitle'),
      description: t('settings.timer.successToastDescription'),
      color: 'success'
    })
  } catch (err) {
    toast.add({
      title: t('settings.timer.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <UForm
    id="timer-settings"
    :schema="schema"
    :state="state"
    class="mb-4 sm:mb-6 lg:mb-12"
    @submit="onSubmit"
  >
    <UPageCard
      :title="$t('settings.timer.title')"
      :description="$t('settings.timer.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div class="flex items-center gap-3 lg:ms-auto">
        <!-- invisible, not v-if: the hint must not shift the layout -->
        <p
          class="text-sm text-warning"
          :class="{ invisible: !isDirty }"
        >
          {{ $t('settings.timer.unsavedChanges') }}
        </p>
        <UButton
          form="timer-settings"
          :label="$t('settings.timer.saveChanges')"
          :loading="updateTimerSettings.isLoading.value"
          :disabled="!isDirty"
          color="neutral"
          type="submit"
          class="w-fit"
        />
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="commanderRoundMinutes"
        :label="$t('settings.timer.fields.commanderRoundMinutes')"
        :description="$t('settings.timer.fields.commanderRoundMinutesDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="state.commanderRoundMinutes"
          :min="10"
          :max="120"
          :step="5"
          class="w-48"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="oneVsOneRoundMinutes"
        :label="$t('settings.timer.fields.oneVsOneRoundMinutes')"
        :description="$t('settings.timer.fields.oneVsOneRoundMinutesDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="state.oneVsOneRoundMinutes"
          :min="10"
          :max="120"
          :step="5"
          class="w-48"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="preRoundWaitMinutes"
        :label="$t('settings.timer.fields.preRoundWaitMinutes')"
        :description="$t('settings.timer.fields.preRoundWaitMinutesDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="state.preRoundWaitMinutes"
          :min="0"
          :max="30"
          :step="1"
          class="w-48"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
