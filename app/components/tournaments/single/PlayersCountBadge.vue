<!-- app\components\tournaments\single\PlayersCountBadge.vue -->
<!--
  "N giocatori" + table-size breakdown ("1 tavolo da 4") shown next to
  "Iscritti (Pagato)" — extracted out of AcceptancePicker.vue (user request,
  2026-08-24) since it only ever needed `count` and `isDraft`, no selection/
  table state. Ported from MagicTheGathering/league's WaitingListStats.vue,
  generalized to Draft's ideal-8/min-6 split or Commander's ideal-4/min-3
  split via the `isDraft` prop, instead of league's single Commander-only
  calculator.
-->
<script setup lang="ts">
const { count, isDraft = false } = defineProps<{
  count: number
  // Which pod-size composable this badge uses (ideal 8/min 6 for Draft vs.
  // ideal 4/min 3 for Commander) — same prop AcceptancePicker.vue itself
  // takes, passed straight through.
  isDraft?: boolean
}>()

const { t } = useI18n()

const { calculatePods: calculateDraftPods } = useDraftPods()
const { calculatePods: calculateCommanderPods } = useCommanderPods()
const minPodSize = computed(() => (isDraft ? 6 : 3))
const podSplit = computed(() => (isDraft ? calculateDraftPods : calculateCommanderPods)(count))

const badge = computed(() => {
  if (count === 0) {
    return { color: 'warning' as const, label: t('tournament.single.acceptancePicker.playersCountEmpty') }
  }
  if (count < minPodSize.value) {
    return {
      color: 'warning' as const,
      label: t(
        'tournament.single.acceptancePicker.playersCountMinimum', { count, min: minPodSize.value }
      )
    }
  }
  if (!podSplit.value.canPlay) {
    return { color: 'error' as const, label: t('tournament.single.acceptancePicker.playersCountInvalid', count) }
  }
  return { color: 'info' as const, label: t('tournament.single.acceptancePicker.playersCount', count) }
})

const TABLE_SIZE_LABEL_KEYS: Record<number, string> = {
  3: 'tournament.single.acceptancePicker.tablesOf3',
  4: 'tournament.single.acceptancePicker.tablesOf4',
  6: 'tournament.single.acceptancePicker.tablesOf6',
  7: 'tournament.single.acceptancePicker.tablesOf7',
  8: 'tournament.single.acceptancePicker.tablesOf8'
}

const tableEstimateLabel = computed(() => {
  if (!podSplit.value.canPlay) return undefined

  const countsBySize = new Map<number, number>()
  for (const size of podSplit.value.tableSizes) {
    countsBySize.set(size, (countsBySize.get(size) ?? 0) + 1)
  }

  return [...countsBySize.entries()]
    .sort(([sizeA], [sizeB]) => sizeB - sizeA)
    .map(([size, tableCount]) => {
      const key = TABLE_SIZE_LABEL_KEYS[size]
      return key ? t(key, tableCount) : null
    })
    .filter((part): part is string => part !== null)
    .join(` ${t('tournament.single.acceptancePicker.tableEstimateConjunction')} `)
})
</script>

<template>
  <UBadge
    :color="badge.color"
    variant="subtle"
    size="lg"
    :ui="{ base: 'px-2.5 py-1.5 text-sm font-medium' }"
  >
    {{ badge.label }}
  </UBadge>
  <span v-if="tableEstimateLabel" class="text-sm font-medium text-highlighted">
    {{ tableEstimateLabel }}
  </span>
</template>
