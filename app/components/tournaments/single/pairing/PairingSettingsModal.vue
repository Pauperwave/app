<!-- app\components\tournaments\single\pairing\PairingSettingsModal.vue -->
<!--
  Weight-tuning + avoid-pairs settings for the pairing optimizer — ported
  from MagicTheGathering/league's PairingSettingsModal.vue (user request,
  2026-09-15).
-->
<script setup lang="ts">
import type { PairingForbiddenPair, PairingWeights, TablePlayer } from '~/types'
import type { PairingPresetKind } from './PairingPresetButtons.vue'

const { t } = useI18n()

interface WeightItem {
  key: keyof PairingWeights
  label: string
  value: number
  min: number
  max: number
  step: number
}

defineProps<{
  selectedPreset: PairingPresetKind
  scoreItems: ReadonlyArray<WeightItem>
  forbiddenPairs: PairingForbiddenPair[]
  allPlayers: TablePlayer[]
}>()

const open = defineModel<boolean>('open', { default: false })
const pairPlayerAModel = defineModel<string>('pairPlayerA', { default: '' })
const pairPlayerBModel = defineModel<string>('pairPlayerB', { default: '' })

const emit = defineEmits<{
  selectPreset: [preset: Exclude<PairingPresetKind, 'custom'>]
  updateWeight: [key: keyof PairingWeights, value: number]
  addPair: []
  resolveConflicts: []
  removePair: [playerA: string, playerB: string]
}>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.tablePreview.settings.title')"
    :description="t('tournament.single.tablePreview.settings.description')"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-6">
        <TournamentsSinglePairingWeightsSection
          :selected-preset="selectedPreset"
          :score-items="scoreItems"
          @select-preset="preset => emit('selectPreset', preset)"
          @update-weight="(key, value) => emit('updateWeight', key, value)"
        />

        <TournamentsSinglePairingForbiddenPairsSection
          v-model:pair-player-a="pairPlayerAModel"
          v-model:pair-player-b="pairPlayerBModel"
          :forbidden-pairs="forbiddenPairs"
          :all-players="allPlayers"
          @add-pair="emit('addPair')"
          @resolve-conflicts="emit('resolveConflicts')"
          @remove-pair="(playerA, playerB) => emit('removePair', playerA, playerB)"
        />
      </div>
    </template>

    <!-- Single "Chiudi" button, not Confirm/Cancel — every slider/pair edit
         here applies live (weights to localStorage, pairs to the DB), there
         is no local draft to confirm or discard. -->
    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          :label="t('common.close')"
          :icon="ICONS.close"
          color="neutral"
          variant="outline"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
