<!-- app\components\statistics\StatChartCardSkeleton.vue -->
<!--
  Same shape as StatChartCard.vue's own `loading` skeleton, extracted so it
  can also be used as a <ClientOnly> #fallback (2026-08-26 fix) — a chart
  component suffixed `.client.vue` renders nothing at all (no fallback slot
  of its own) until it actually mounts on the client, so on a hard reload
  there's still a gap between the page's own HTML appearing and the chart
  component mounting at all, before StatChartCard's `loading` prop ever gets
  a chance to matter. Wrapping those chart usages in an explicit <ClientOnly>
  with this as #fallback covers that gap with the same visual placeholder,
  so there's one continuous skeleton instead of blank-then-skeleton-then-chart.
-->
<template>
  <UCard :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <USkeleton class="h-3 w-24 mb-1.5" />
        <USkeleton class="h-9 w-28 my-0.5" />
        <USkeleton class="h-3 w-32 mt-1" />
      </div>
    </template>

    <USkeleton class="h-96 w-full" />
  </UCard>
</template>
