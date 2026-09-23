<!-- app\components\settings\TournamentSettingsForm.vue -->
<!--
  /settings' "Tornei" section: the values that used to be hardcoded in the
  tournament logic — round duration and round count per format family, and
  the Swiss round-count tiers. Swiss scoring (3/1/0 points, the 0.33
  tiebreak floor) is deliberately absent: it is fixed by the official Magic
  Tournament Rules.
-->
<script setup lang="ts">
import * as v from 'valibot'
import { useEventListener } from '@vueuse/core'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { SwissRoundCountTier } from '#shared/types/settings'

const { t } = useI18n()
const toast = useToast()

const settings = useSettingsQuery()
const { updateTournamentSettings } = useSettingsMutations()

const roundsSchema = v.pipe(
  v.number(t('settings.tournament.validation.rounds')),
  v.integer(t('settings.tournament.validation.rounds')),
  v.minValue(1, t('settings.tournament.validation.rounds'))
)

const schema = v.object({
  commanderRoundCount: roundsSchema,
  oneVsOneRoundCount: roundsSchema,
  swissRoundCountBeyond: roundsSchema,
  tiers: v.array(v.object({ maxPlayers: roundsSchema, rounds: roundsSchema }))
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({
  commanderRoundCount: undefined,
  oneVsOneRoundCount: undefined,
  swissRoundCountBeyond: undefined,
  tiers: []
})

// Form values as last loaded or saved, to tell when there are unsaved edits.
const savedSnapshot = ref('')
const isDirty = computed(() => JSON.stringify(state) !== savedSnapshot.value)

// Fills the form once, the first time the query resolves — not a continuous
// sync, which would clobber an in-progress edit on a window-refocus refetch.
watch(settings.data, (data) => {
  if (!data || state.commanderRoundCount !== undefined) return
  state.commanderRoundCount = data.commanderRoundCount
  state.oneVsOneRoundCount = data.oneVsOneRoundCount
  state.swissRoundCountBeyond = data.swissRoundCountBeyond
  state.tiers = data.swissRoundCountTiers.map((tier: SwissRoundCountTier) => ({ ...tier }))
  savedSnapshot.value = JSON.stringify(state)
}, { immediate: true })

useEventListener('beforeunload', (event) => {
  if (isDirty.value) event.preventDefault()
})

function addTier() {
  const lastTier = state.tiers?.at(-1)
  state.tiers?.push({
    maxPlayers: (lastTier?.maxPlayers ?? 0) + 8,
    rounds: lastTier?.rounds ?? 3
  })
}

function removeTier(index: number) {
  state.tiers?.splice(index, 1)
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { tiers, ...values } = event.data

  try {
    await updateTournamentSettings.mutateAsync({
      ...values,
      swissRoundCountTiers: tiers
    })
    savedSnapshot.value = JSON.stringify(state)
    toast.add({
      title: t('settings.tournament.successToastTitle'),
      description: t('settings.tournament.successToastDescription'),
      color: 'success'
    })
  } catch (err) {
    toast.add({
      title: t('settings.tournament.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <UForm
    id="tournament-settings"
    :schema="schema"
    :state="state"
    class="mb-4 sm:mb-6 lg:mb-12"
    @submit="onSubmit"
  >
    <UPageCard
      :title="$t('settings.tournament.title')"
      :description="$t('settings.tournament.description')"
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
          {{ $t('settings.tournament.unsavedChanges') }}
        </p>
        <UButton
          form="tournament-settings"
          :label="$t('settings.tournament.saveChanges')"
          :loading="updateTournamentSettings.isLoading.value"
          :disabled="!isDirty"
          color="neutral"
          type="submit"
          class="w-fit"
        />
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="commanderRoundCount"
        :label="$t('settings.tournament.fields.commanderRoundCount')"
        :description="$t('settings.tournament.fields.commanderRoundCountDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="state.commanderRoundCount"
          :min="1"
          :step="1"
          class="w-48"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="oneVsOneRoundCount"
        :label="$t('settings.tournament.fields.oneVsOneRoundCount')"
        :description="$t('settings.tournament.fields.oneVsOneRoundCountDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="state.oneVsOneRoundCount"
          :min="1"
          :step="1"
          class="w-48"
        />
      </UFormField>
      <USeparator />
      <div class="space-y-3">
        <div>
          <p class="text-sm font-medium">
            {{ $t('settings.tournament.fields.swissTiers') }}
          </p>
          <p class="text-sm text-muted">
            {{ $t('settings.tournament.fields.swissTiersDescription') }}
          </p>
        </div>
        <div
          v-for="(tier, index) in state.tiers"
          :key="index"
          class="flex items-start gap-2"
        >
          <span class="pt-1.5 text-sm text-muted">
            {{ $t('settings.tournament.fields.upTo') }}
          </span>
          <UFormField :name="`tiers.${index}.maxPlayers`">
            <UInputNumber
              v-model="tier.maxPlayers"
              :min="1"
              :step="1"
              class="w-32"
            />
          </UFormField>
          <span class="pt-1.5 text-sm text-muted">
            {{ $t('settings.tournament.fields.playersRounds') }}
          </span>
          <UFormField :name="`tiers.${index}.rounds`">
            <UInputNumber
              v-model="tier.rounds"
              :min="1"
              :step="1"
              class="w-32"
            />
          </UFormField>
          <UButton
            :icon="ICONS.delete"
            :aria-label="$t('settings.tournament.fields.remove')"
            color="neutral"
            variant="ghost"
            class="hover:text-error"
            @click="removeTier(index)"
          />
        </div>
        <UButton
          :label="$t('settings.tournament.fields.addTier')"
          :icon="ICONS.add"
          color="neutral"
          variant="outline"
          @click="addTier"
        />
      </div>
      <USeparator />
      <UFormField
        name="swissRoundCountBeyond"
        :label="$t('settings.tournament.fields.swissRoundCountBeyond')"
        :description="$t('settings.tournament.fields.swissRoundCountBeyondDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="state.swissRoundCountBeyond"
          :min="1"
          :step="1"
          class="w-48"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
