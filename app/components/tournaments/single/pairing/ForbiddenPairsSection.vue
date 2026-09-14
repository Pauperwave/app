<!-- app\components\tournaments\single\pairing\ForbiddenPairsSection.vue -->
<!--
  Global "never seat these two players together" list editor — ported from
  MagicTheGathering/league's ForbiddenPairsSection.vue (user request,
  2026-09-15). Player identity is the associate uuid (TablePlayer.value)
  throughout, matching every other pairing composable in this app.
-->
<script setup lang="ts">
import type { PairingForbiddenPair, TablePlayer } from '~/types'

const { forbiddenPairs, allPlayers } = defineProps<{
  forbiddenPairs: PairingForbiddenPair[]
  allPlayers: TablePlayer[]
}>()

const emit = defineEmits<{
  addPair: []
  resolveConflicts: []
  removePair: [playerA: string, playerB: string]
}>()

const { t } = useI18n()

const pairPlayerA = defineModel<string>('pairPlayerA', { default: '' })
const pairPlayerB = defineModel<string>('pairPlayerB', { default: '' })

const playerOptions = computed(() =>
  allPlayers.map(player => ({ value: player.value, label: player.label })))

const canAddForbiddenPair = computed(() => {
  if (!pairPlayerA.value || !pairPlayerB.value) return false
  return pairPlayerA.value !== pairPlayerB.value
})

const forbiddenPairsDisplay = computed(() => {
  const playerMap = new Map(allPlayers.map(player => [player.value, player.label]))
  return forbiddenPairs.map(pair => ({
    key: getForbiddenPairKey(pair.playerA, pair.playerB),
    playerA: pair.playerA,
    playerB: pair.playerB,
    label: `${playerMap.get(pair.playerA) ?? pair.playerA} — ${playerMap.get(pair.playerB) ?? pair.playerB}`
  }))
})
</script>

<template>
  <section class="space-y-3">
    <div class="text-sm font-semibold">
      {{ t('tournament.single.tablePreview.forbiddenPairs.heading') }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
      <USelectMenu
        v-model="pairPlayerA"
        :items="playerOptions"
        value-key="value"
        :placeholder="t('tournament.single.tablePreview.forbiddenPairs.playerAPlaceholder')"
        :search-input="{
          placeholder: t('tournament.single.tablePreview.forbiddenPairs.searchPlaceholder')
        }"
      />

      <USelectMenu
        v-model="pairPlayerB"
        :items="playerOptions"
        value-key="value"
        :placeholder="t('tournament.single.tablePreview.forbiddenPairs.playerBPlaceholder')"
        :search-input="{
          placeholder: t('tournament.single.tablePreview.forbiddenPairs.searchPlaceholder')
        }"
      />

      <UButton
        color="neutral"
        variant="soft"
        :icon="ICONS.add"
        :disabled="!canAddForbiddenPair"
        @click="emit('addPair')"
      >
        {{ t('tournament.single.tablePreview.forbiddenPairs.addPair') }}
      </UButton>

      <UButton
        color="warning"
        variant="outline"
        :icon="ICONS.refresh"
        @click="emit('resolveConflicts')"
      >
        {{ t('tournament.single.tablePreview.forbiddenPairs.resolveConflicts') }}
      </UButton>
    </div>

    <div class="max-h-48 overflow-auto space-y-1 pr-1">
      <div v-if="!forbiddenPairsDisplay.length" class="text-sm text-muted">
        {{ t('tournament.single.tablePreview.forbiddenPairs.empty') }}
      </div>

      <div
        v-for="pair in forbiddenPairsDisplay"
        :key="pair.key"
        class="flex items-center justify-between rounded border border-default/70 bg-muted/20 px-2 py-1.5"
      >
        <span class="text-sm">{{ pair.label }}</span>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :icon="ICONS.delete"
          @click="emit('removePair', pair.playerA, pair.playerB)"
        />
      </div>
    </div>

    <div class="text-xs text-muted">
      {{ t('tournament.single.tablePreview.forbiddenPairs.storageNote') }}
    </div>
  </section>
</template>
