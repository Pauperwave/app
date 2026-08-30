<!-- app\components\ui\StandingsLegend.vue -->
<!--
  Shared "counted / dropped / absent[/ participation]" legend row, used by
  cittadino and format standings pages (Public + internal variants —
  fallow:dupes flagged the identical span markup across all four). Each item
  is `{ sample, labelKey, dimmed? }`: `sample` renders highlighted unless
  `dimmed` is set (matches the "(dropped)" and "· absent" treatment).
-->
<script setup lang="ts">
interface LegendItem {
  sample: string | number | undefined
  labelKey: string
  dimmed?: boolean
}

defineProps<{ items: LegendItem[] }>()
</script>

<template>
  <div class="flex items-center gap-4 text-xs text-muted">
    <span
      v-for="item in items"
      :key="item.labelKey"
      class="flex items-center gap-1.5"
    >
      <span :class="item.dimmed ? 'text-dimmed' : 'font-medium text-highlighted'">
        {{ item.sample }}
      </span>
      {{ $t(item.labelKey) }}
    </span>
  </div>
</template>
