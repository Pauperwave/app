<!-- app\components\settings\TournamentSettingsForm.vue -->
<!--
  /settings' "Tornei" section: the values that used to be hardcoded in the
  tournament logic — round duration per format family, the default round
  count and the two round-count tables. Swiss scoring (3/1/0 points, the 0.33
  tiebreak floor) is deliberately absent: it is fixed by the official Magic
  Tournament Rules.
-->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { SwissRoundCountTier } from '#shared/types/settings'

const { t } = useI18n()
const toast = useToast()

const settings = useSettingsQuery()
const { data: formats } = useMtgFormatsQuery()
const { updateTournamentSettings } = useSettingsMutations()

const formatNames = computed(() => (formats.value ?? []).map(format => format.name))

const minutesSchema = v.pipe(
  v.number(t('settings.tournament.validation.minutes')),
  v.integer(t('settings.tournament.validation.minutes')),
  v.minValue(10, t('settings.tournament.validation.minutes')),
  v.maxValue(120, t('settings.tournament.validation.minutes'))
)
const roundsSchema = v.pipe(
  v.number(t('settings.tournament.validation.rounds')),
  v.integer(t('settings.tournament.validation.rounds')),
  v.minValue(1, t('settings.tournament.validation.rounds'))
)

const schema = v.object({
  commanderRoundMinutes: minutesSchema,
  oneVsOneRoundMinutes: minutesSchema,
  defaultRoundCount: roundsSchema,
  swissRoundCountBeyond: roundsSchema,
  formatRounds: v.array(v.object({
    format: v.pipe(v.string(), v.minLength(1, t('settings.tournament.validation.format'))),
    rounds: roundsSchema
  })),
  tiers: v.array(v.object({ maxPlayers: roundsSchema, rounds: roundsSchema }))
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({
  commanderRoundMinutes: undefined,
  oneVsOneRoundMinutes: undefined,
  defaultRoundCount: undefined,
  swissRoundCountBeyond: undefined,
  formatRounds: [],
  tiers: []
})

// Fills the form once, the first time the query resolves — not a continuous
// sync, which would clobber an in-progress edit on a window-refocus refetch.
watch(settings.data, (data) => {
  if (!data || state.commanderRoundMinutes !== undefined) return
  state.commanderRoundMinutes = data.commanderRoundMinutes
  state.oneVsOneRoundMinutes = data.oneVsOneRoundMinutes
  state.defaultRoundCount = data.defaultRoundCount
  state.swissRoundCountBeyond = data.swissRoundCountBeyond
  state.formatRounds = Object.entries(data.roundCountByFormat)
    .map(([format, rounds]) => ({ format, rounds }))
  state.tiers = data.swissRoundCountTiers.map((tier: SwissRoundCountTier) => ({ ...tier }))
}, { immediate: true })

function addFormatRounds() {
  state.formatRounds?.push({ format: '', rounds: state.defaultRoundCount ?? 2 })
}

function removeFormatRounds(index: number) {
  state.formatRounds?.splice(index, 1)
}

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
  const { formatRounds, tiers, ...values } = event.data

  try {
    await updateTournamentSettings.mutateAsync({
      ...values,
      roundCountByFormat: Object.fromEntries(formatRounds.map(row => [row.format, row.rounds])),
      swissRoundCountTiers: tiers
    })
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
      <UButton
        form="tournament-settings"
        :label="$t('settings.tournament.saveChanges')"
        :loading="updateTournamentSettings.isLoading.value"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="commanderRoundMinutes"
        :label="$t('settings.tournament.fields.commanderRoundMinutes')"
        :description="$t('settings.tournament.fields.commanderRoundMinutesDescription')"
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
        :label="$t('settings.tournament.fields.oneVsOneRoundMinutes')"
        :description="$t('settings.tournament.fields.oneVsOneRoundMinutesDescription')"
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
        name="defaultRoundCount"
        :label="$t('settings.tournament.fields.defaultRoundCount')"
        :description="$t('settings.tournament.fields.defaultRoundCountDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="state.defaultRoundCount"
          :min="1"
          :step="1"
          class="w-48"
        />
      </UFormField>
      <USeparator />
      <div class="space-y-3">
        <div>
          <p class="text-sm font-medium">
            {{ $t('settings.tournament.fields.roundCountByFormat') }}
          </p>
          <p class="text-sm text-muted">
            {{ $t('settings.tournament.fields.roundCountByFormatDescription') }}
          </p>
        </div>
        <div
          v-for="(row, index) in state.formatRounds"
          :key="index"
          class="flex items-start gap-2"
        >
          <UFormField :name="`formatRounds.${index}.format`">
            <USelectMenu
              v-model="row.format"
              :items="formatNames"
              :placeholder="$t('settings.tournament.fields.formatPlaceholder')"
              class="w-48"
            />
          </UFormField>
          <UFormField :name="`formatRounds.${index}.rounds`">
            <UInputNumber
              v-model="row.rounds"
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
            @click="removeFormatRounds(index)"
          />
        </div>
        <UButton
          :label="$t('settings.tournament.fields.addFormat')"
          :icon="ICONS.add"
          color="neutral"
          variant="outline"
          @click="addFormatRounds"
        />
      </div>
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
