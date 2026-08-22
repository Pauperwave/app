<!-- app\components\ui\ListSkeleton.vue -->
<!--
  Placeholder for a list page's own grid/table content while its query is
  loading (issue #35, user request 2026-08-22) — replaces the generic
  spinning-icon block every list page used before, which gave no sense of
  the page's actual shape. Deliberately not the refresh button's own
  `:loading` spinner (QueryRefreshControl.vue, kept as-is per user decision)
  — this is about the content area, not the button.

  Rolled out to /tournaments first as the proof of the pattern; other
  Pinia Colada-backed list pages (associates, leagues, events, locations,
  transactions, wanted-cards, players) can adopt it the same way once this
  shape is confirmed to fit.
-->
<script setup lang="ts">
const { variant, count = 6, columns = 5 } = defineProps<{
  variant: 'grid' | 'table'
  /** How many placeholder cards/rows to render. @default 6 */
  count?: number
  /** Table variant only — how many column bars per row. @default 5 */
  columns?: number
}>()

const items = computed(() => Array.from({ length: count }))
const cols = computed(() => Array.from({ length: columns }))
</script>

<template>
  <div v-if="variant === 'grid'" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <!-- Mirrors TournamentsListCard.vue's own shape exactly (same UCard,
         cover height, title/badges/footer rows) — a generic placeholder
         card here just looked like a different, smaller component instead
         of "this card, loading" (user feedback, 2026-08-22). -->
    <UCard
      v-for="(_, index) in items"
      :key="index"
      class="overflow-hidden"
      :ui="{ body: 'p-3 sm:p-3', footer: 'p-3 sm:p-3' }"
    >
      <!-- overflow-hidden above matters here specifically: the cover's
           negative margin (same -m-3/mb-3 bleed as the real Cover.vue) has
           nothing to clip it to without it, so it bled outside the card's
           own box and overlapped neighboring grid cells — only the first
           couple of cards ever showed correctly (user feedback, 2026-08-22). -->
      <USkeleton class="w-full h-32 -m-3 mb-3 rounded-none" />

      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1 space-y-1.5">
          <USkeleton class="h-4 w-3/4" />
          <USkeleton class="h-3 w-1/3" />
        </div>
        <USkeleton class="size-6 !rounded-md shrink-0" />
      </div>

      <!-- rounded-md, not a pill: UBadge's own default (md) size is
           "rounded-md" (.nuxt/ui/badge.ts), not full-rounded — checked
           2026-08-22 after wrongly assuming pill-shaped badges the first
           time. Matches USkeleton's own theme default already, no override
           needed. -->
      <div class="flex items-center gap-2 mt-1.5">
        <USkeleton class="h-5 w-16" />
        <USkeleton class="h-5 w-14" />
        <USkeleton class="h-5 w-20" />
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-2">
          <USkeleton class="h-5 w-10" />
          <USkeleton class="h-4 w-12" />
        </div>
      </template>
    </UCard>
  </div>

  <div v-else class="rounded-lg border border-default divide-y divide-default overflow-hidden">
    <div v-for="(_row, index) in items" :key="index" class="flex items-center gap-4 px-4 py-3">
      <USkeleton v-for="(_col, colIndex) in cols" :key="colIndex" class="h-4 flex-1" />
    </div>
  </div>
</template>
