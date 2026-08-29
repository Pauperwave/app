<!-- app\components\wanted-cards\list\DenseSkeleton.vue -->
<!--
  Dense-mode counterpart to GridSkeleton.vue — same small-tile grid
  DenseView.vue's real cards use, so the skeleton occupies the same
  footprint dense view will render into.
-->
<script setup lang="ts">
const { count = 24 } = defineProps<{
  count?: number
}>()
</script>

<template>
  <div class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(min(140px,40vw),1fr))]">
    <UCard
      v-for="n in count"
      :key="n"
      :ui="{ body: 'p-0 sm:p-0', footer: 'p-1.5 sm:p-1.5' }"
      class="overflow-hidden"
    >
      <USkeleton class="w-full aspect-5/7" />
      <template #footer>
        <USkeleton class="h-3 w-16" />
      </template>
    </UCard>
  </div>
</template>
