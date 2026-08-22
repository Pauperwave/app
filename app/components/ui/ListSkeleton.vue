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
         of "this card, loading" (user feedback, 2026-08-22). Reuses the real
         UCard itself rather than a hand-rolled div: its `root` slot already
         ships `rounded-lg overflow-hidden` (.nuxt/ui/card.ts), which is what
         actually clips the cover's -m-3 bleed below — no need to duplicate
         overflow-hidden by hand, and both states (loading/loaded) stay in
         sync automatically if the Card theme ever changes. -->
    <UCard
      v-for="(_, index) in items"
      :key="index"
      :ui="{ body: 'p-3 sm:p-3', footer: 'p-3 sm:p-3' }"
    >
      <!-- Two elements, not one: TournamentsListCover.vue's own bleed is an
           outer `-m-3 mb-3` wrapper around an inner `w-full h-32` image —
           collapsing both onto a single USkeleton put the width sizing and
           the negative margin on the same box, which doesn't bleed
           symmetrically (the right edge came out wrong, user feedback
           2026-08-22). Mirroring the real two-element shape fixes it. -->
      <div class="relative -m-3 mb-3">
        <USkeleton class="w-full h-32 rounded-none" />
      </div>

      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1 space-y-1.5">
          <USkeleton class="h-4 w-3/4" />
          <USkeleton class="h-3 w-1/3" />
        </div>
        <USkeleton class="size-6 shrink-0" />
      </div>

      <!-- rounded-md, not a pill: UBadge's own default (md) size is
           "rounded-md" (.nuxt/ui/badge.ts), matching USkeleton's own theme
           default already — no override needed. When a real override *is*
           needed (a genuinely different shape), prefer `:ui="{ base: '...' }"`
           over a conflicting plain `class` — it merges through the same
           tv() slot the theme's own base class does, so it reliably wins
           without needing `!important`. -->
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
