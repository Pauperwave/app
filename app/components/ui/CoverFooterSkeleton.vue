<!-- app\components\ui\CoverFooterSkeleton.vue -->
<!-- The bottom-left/right skeleton pair shown while a Cover.vue-style card
     image loads (fee/date + card-art-attribution placeholders) — shared by
     tournaments/list/Cover.vue and events/list/Cover.vue, which
     independently duplicated this exact markup (fallow:dupes, 2026-09-23). -->
<template>
  <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
    <USkeleton class="w-20 h-6 rounded" :ui="{ base: 'bg-black' }" />
    <USkeleton class="w-24 h-4 rounded" :ui="{ base: 'bg-black' }" />
  </div>
</template>
