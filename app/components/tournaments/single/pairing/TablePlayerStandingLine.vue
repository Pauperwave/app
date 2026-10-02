<!-- app\components\tournaments\single\pairing\TablePlayerStandingLine.vue -->
<!-- One line under a player's name in the table previews: rank, points, record and tiebreakers. -->
<script setup lang="ts">
import type { TablePlayerStanding } from '~/types'

const { standing } = defineProps<{
  standing: TablePlayerStanding
}>()

const { t } = useI18n()

const text = computed(() => [
  `#${standing.rank}`,
  t('tournament.single.tablePreview.standingPoints', { points: standing.points }),
  ...(standing.record ? [standing.record] : []),
  ...standing.tiebreakers.map(tiebreaker => `${tiebreaker.label} ${tiebreaker.value}`)
].join(' · '))
</script>

<template>
  <!-- Truncated so it never wraps; the tooltip carries the full line. -->
  <UTooltip :text="text">
    <span class="block truncate text-xs text-muted tabular-nums">{{ text }}</span>
  </UTooltip>
</template>
