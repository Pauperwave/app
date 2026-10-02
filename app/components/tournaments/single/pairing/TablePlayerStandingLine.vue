<!-- app\components\tournaments\single\pairing\TablePlayerStandingLine.vue -->
<!-- One line under a player's name in the table previews: rank, points, record and tiebreakers. -->
<script setup lang="ts">
import type { TablePlayerStanding } from '~/types'

const { standing } = defineProps<{
  standing: TablePlayerStanding
}>()

const { t } = useI18n()

const points = computed(() =>
  t('tournament.single.tablePreview.standingPoints', { points: standing.points }))

// The tooltip always spells every tiebreaker out, even the ones the line shows as an icon.
const fullText = computed(() => [
  `#${standing.rank}`,
  points.value,
  ...(standing.record ? [standing.record] : []),
  ...standing.tiebreakers.map(tiebreaker => `${tiebreaker.label} ${tiebreaker.value}`)
].join(' · '))
</script>

<template>
  <!-- One line that never wraps; the tooltip carries the full text. -->
  <UTooltip :text="fullText">
    <span class="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-xs text-muted tabular-nums">
      <span>#{{ standing.rank }}</span>
      <span class="text-dimmed">·</span>
      <span>{{ points }}</span>
      <template v-if="standing.record">
        <span class="text-dimmed">·</span>
        <span>{{ standing.record }}</span>
      </template>
      <template v-if="standing.tiebreakers.length">
        <span class="text-dimmed">·</span>
        <!-- Tiebreakers as one group, slash-separated: "🏆 2/🗡 3/🧪 1/⚡ 0". -->
        <span class="inline-flex items-center gap-0.5">
          <template v-for="(tiebreaker, index) in standing.tiebreakers" :key="tiebreaker.label">
            <span v-if="index > 0" class="text-dimmed">/</span>
            <span class="inline-flex items-center gap-px" :aria-label="`${tiebreaker.label} ${tiebreaker.value}`">
              <UIcon
                v-if="tiebreaker.icon"
                :name="tiebreaker.icon"
                class="size-3 shrink-0"
              />
              <template v-else>{{ tiebreaker.label }}</template>
              {{ tiebreaker.value }}
            </span>
          </template>
        </span>
      </template>
    </span>
  </UTooltip>
</template>
