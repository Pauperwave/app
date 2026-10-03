<!-- app\components\statistics\StatChartCardSkeleton.vue -->
<!-- The same shape as StatChartCard.vue's `loading` skeleton, extracted so it can also be a
     <ClientOnly> #fallback: a chart component suffixed `.client.vue` renders nothing (no
     fallback slot of its own) until it mounts on the client, so on a hard reload there is a gap
     between the page's HTML appearing and the chart mounting, before StatChartCard's `loading`
     can matter. Wrapping those chart usages in an explicit <ClientOnly> with this as #fallback
     covers the gap with the same placeholder: one continuous skeleton instead of
     blank-then-skeleton-then-chart. -->
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
