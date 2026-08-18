<!-- app\components\statistics\StatChartCard.vue -->
<!-- Shared shell for every chart on /statistics — extracted 2026-08-18: the
UCard header (title/value/caption + optional legend) and the unovis CSS-var
style block were byte-identical across all 5 chart components. Each chart
file now only owns its data/accessors and the VisXYContainer content, passed
through the default slot; `width` (from useElementSize on this card) is
exposed via the slot so the container can still size itself. -->
<script setup lang="ts">
import { VisBulletLegend } from '@unovis/vue'

interface LegendItem {
  name: string
  color: string
}

interface Props {
  title: string
  value: string | number
  caption: string
  legendItems?: LegendItem[]
  // Only AssociatesGrowthChart.client.vue overrides these (bigger legend,
  // by request) — every other chart's legend uses VisBulletLegend's own
  // defaults.
  legendBulletSize?: string
  legendLabelFontSize?: string
}

const {
  title, value, caption, legendItems = [], legendBulletSize, legendLabelFontSize
} = defineProps<Props>()

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div class="flex items-start flex-wrap justify-between gap-x-8 gap-y-2">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5 whitespace-nowrap">
            {{ title }}
          </p>
          <p class="text-3xl text-highlighted font-semibold">
            {{ value }}
          </p>
          <p class="text-xs text-muted">
            {{ caption }}
          </p>
        </div>

        <VisBulletLegend
          v-if="legendItems.length"
          :items="legendItems"
          :bullet-size="legendBulletSize"
          :label-font-size="legendLabelFontSize"
        />
      </div>
    </template>

    <slot :width="width" />
  </UCard>
</template>

<!-- Not `scoped`: the chart content itself lives in each consumer's own
<template #default> slot content, which keeps ITS OWN component's scope
attribute, not this one's — a `scoped` rule here would never match
.unovis-xy-container at all. Every chart on this page wants the exact same
theming anyway, so a plain global rule is the correct (and only working)
way to share it. -->
<style>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
