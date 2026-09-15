<!-- app\components\tournaments\single\PlayersCountBadge.vue -->
<!--
  "N giocatori" + table-size breakdown ("1 tavolo da 4") shown next to
  "Iscritti (Pagato)" — extracted out of AcceptancePicker.vue (user request,
  2026-08-24) since it only ever needed `count` and `isDraft`, no selection/
  table state. Ported from MagicTheGathering/league's WaitingListStats.vue,
  generalized to Draft's ideal-8/min-6 split, Commander's ideal-4/min-3
  split, or 1v1 Swiss's pairs-of-2 (Phase 1 of
  docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md) via the
  isDraft/is1v1 props, instead of league's single Commander-only calculator.
-->
<script setup lang="ts">
const { count, isDraft = false, is1v1 = false } = defineProps<{
  count: number
  // Which pod-size composable this badge uses (ideal 8/min 6 for Draft,
  // ideal 4/min 3 for Commander, pairs of 2 for 1v1 Swiss) — same props
  // AcceptancePicker.vue itself takes, passed straight through.
  isDraft?: boolean
  is1v1?: boolean
}>()

const { t } = useI18n()

const { calculatePods: calculateDraftPods } = useDraftPods()
const { calculatePods: calculateCommanderPods } = useCommanderPods()
const { calculatePairing: calculateSwissPairing } = useSwissPairing()
const minPodSize = computed(() => {
  if (isDraft) return 6
  if (is1v1) return 2
  return 3
})
const podSplit = computed(() => {
  if (isDraft) return calculateDraftPods(count)
  if (is1v1) {
    const { canPlay, tableCount } = calculateSwissPairing(count)
    return { canPlay, tableSizes: canPlay ? Array.from({ length: tableCount }, () => 2) : [] }
  }
  return calculateCommanderPods(count)
})

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
  2: 'tournament.single.acceptancePicker.tablesOf2',
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
  <!-- Single pill instead of a bold badge next to an equally bold plain-text
       span (previous look, 2026-09-14 user feedback: "non mi piace tantissimo")
       — the table breakdown now sits inside the same badge, de-emphasized
       (font-normal + muted) after a middle-dot separator, so it reads as a
       detail of the player count rather than a second competing headline. -->
  <UBadge
    :color="badge.color"
    :icon="ICONS.players"
    variant="subtle"
    size="lg"
    :ui="{ base: 'px-2.5 py-1.5 text-sm font-medium gap-1.5' }"
  >
    {{ badge.label }}
    <span v-if="tableEstimateLabel" class="font-normal text-muted">
      · {{ tableEstimateLabel }}
    </span>
  </UBadge>
</template>
