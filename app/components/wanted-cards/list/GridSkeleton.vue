<!-- app\components\wanted-cards\list\GridSkeleton.vue -->
<!--
  Grid-mode counterpart to ListSkeleton.vue (which is table-shaped and
  doesn't fit here) — same auto-fill/min(280px,45vw)/aspect-[5/7] layout as
  GridView.vue's real cards, so the skeleton occupies the same footprint
  wanted-cards/index.vue's grid view will render into.
-->
<script setup lang="ts">
const { count = 12 } = defineProps<{
  count?: number
}>()
</script>

<template>
  <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,45vw),1fr))]">
    <UCard
      v-for="n in count"
      :key="n"
      :ui="{ body: 'p-0 sm:p-0', footer: 'p-3 sm:p-3' }"
      class="overflow-hidden"
    >
      <USkeleton class="w-full aspect-5/7" />
      <template #footer>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <USkeleton class="size-6 rounded-full shrink-0" />
              <USkeleton class="h-3.5 w-16" />
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <USkeleton class="h-3.5 w-10" />
              <USkeleton class="h-3.5 w-10" />
            </div>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <USkeleton class="h-5 w-8 rounded-full" />
              <USkeleton class="h-5 w-16 rounded-full" />
            </div>
            <USkeleton class="h-3.5 w-14" />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
