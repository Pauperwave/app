<!-- app\components\statistics\StatChartCard.vue -->
<!-- Shared shell for every chart on /statistics: the UCard header (title/value/caption +
     optional legend) and the unovis CSS-var style block were identical across all 5 chart
     components. Each chart file only owns its data/accessors and the VisXYContainer content,
     passed through the default slot; `width` (from useElementSize on this card) is exposed via
     the slot so the container can size itself. -->
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
  // Skeletons the value + chart body instead of rendering the default slot: every chart computes
  // `value`/passes `rows` synchronously from whatever the parent query has, so before it resolves
  // they briefly render with empty/zeroed data (an empty VisXYContainer, a "0 €" value) and then
  // pop to the real chart: a jarring flash, not a loading state. Every /finance and /statistics
  // chart wires this to its query's isLoading. Optional (defaults false) so a future chart that
  // never loads isn't forced to
  loading?: boolean
}

const {
  title, value, caption, legendItems = [], legendBulletSize, legendLabelFontSize, loading = false
} = defineProps<Props>()

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div class="flex flex-col gap-2">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5 whitespace-nowrap">
            {{ title }}
          </p>
          <USkeleton v-if="loading" class="h-9 w-28 my-0.5" />
          <p v-else class="text-3xl text-highlighted font-semibold">
            {{ value }}
          </p>
          <p class="text-xs text-muted">
            {{ caption }}
          </p>
        </div>

        <VisBulletLegend
          v-if="legendItems.length && !loading"
          :items="legendItems"
          :bullet-size="legendBulletSize"
          :label-font-size="legendLabelFontSize"
        />
      </div>
    </template>

    <USkeleton v-if="loading" class="h-96 w-full" />
    <slot v-else :width="width" />
  </UCard>
</template>

<!-- Not `scoped`: the chart content lives in each consumer's own <template #default> slot,
     which keeps ITS component's scope attribute, so a `scoped` rule here would never match
     .unovis-xy-container. Every chart wants the same theming, so a plain global rule is the
     only working way to share it. -->
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
