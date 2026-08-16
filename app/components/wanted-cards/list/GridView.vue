<!-- app\components\wanted-cards\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import type { Selection } from '~/composables/useSelection'

interface GridSection {
  /** null = nessun raggruppamento attivo, nessuna intestazione di sezione. */
  player: string | null
  cards: WantedCard[]
}

const {
  sections, contextMenuItems, selection, showStatus = false
} = defineProps<{
  sections: GridSection[]
  contextMenuItems: (card: WantedCard) => DropdownMenuItem[]
  selection: Selection<number>
  /** Show the status badge (Found/Searching) — only when the active tab is "All", where the filter would otherwise not make it clear. */
  showStatus?: boolean
}>()

const hasCards = computed(() => sections.some(section => section.cards.length))

// Anchors the guided tour's "anatomy of a card" step (see useTour in
// wanted-cards/index.vue) on the first rendered card, whatever the active
// section/grouping is.
const firstCardId = computed(() => sections.flatMap(section => section.cards)[0]?.id)

// The ordered list a shift-click range resolves against — every currently
// rendered card, flattened across sections in the same order they're drawn
// (top to bottom, left to right within a section).
const range = computed(() => sections.flatMap(section => section.cards).map(card => card.id))

// Captured from the checkbox's own native `click` (fires synchronously
// before the `update:modelValue` it triggers) so a shift-click can be told
// apart from a plain one — same convention as useWantedCardsTableColumns.ts.
// A ref, not a plain `let`: the template assigns to this on click, and only
// a ref's assignment is visible to Vue's template compiler (a closure
// variable's write inside a template expression isn't observed there).
const lastClickShiftKey = ref(false)
</script>

<template>
  <div v-if="!hasCards" class="text-center py-12 text-muted">
    {{ $t('wantedCard.grid.empty') }}
  </div>

  <div v-else class="flex flex-col gap-6">
    <div v-for="section in sections" :key="section.player ?? '__ungrouped'">
      <div v-if="section.player" class="flex items-center gap-1.5 mb-3">
        <PlayerTag :name="section.player" />
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ section.cards.length }}
        </UBadge>
      </div>

      <!-- auto-fill instead of fixed breakpoints: the cards size themselves
           from the available space while staying close to a real MTG card's
           proportions (63×88mm ≈ a 5:7 ratio, see aspect-[5/7] on the image).
           280px = w-70, the same width used for the single preview in
           CardPreviewTooltip.vue (copied from MagicTheGathering/blog's
           magic/card/Tooltip.vue) — the same reference size for a card across
           the whole ecosystem. min(280px,45vw) stops that minimum from forcing
           overflow on narrow screens (mobile): there the column shrinks in
           proportion to the viewport instead. -->
      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,45vw),1fr))]">
        <WantedCardsListGridCard
          v-for="card in section.cards"
          :key="card.id"
          v-model:last-click-shift-key="lastClickShiftKey"
          :card="card"
          :context-menu-items="contextMenuItems(card)"
          :selection="selection"
          :range="range"
          :is-first-card="card.id === firstCardId"
          :grouped-by-player="!!section.player"
          :show-status="showStatus"
        />
      </div>
    </div>
  </div>
</template>
