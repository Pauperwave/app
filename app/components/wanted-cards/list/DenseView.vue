<!-- app\components\wanted-cards\list\DenseView.vue -->
<!--
  Third view mode alongside table/grid (user request, 2026-08-29) — a
  Microsoft-Store-style dense grid: small UCard tiles (image + name + price
  only, no meta badges/notes/age/status), packing far more cards per screen
  than GridView.vue's full-size tiles. Reuses GridView.vue's own section/
  grouping shape (same `sections` prop, same wanted-cards/index.vue
  gridSections computed feeds both) — sort/group state is shared between
  grid and dense, only the per-card rendering + tile size differ.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import type { Selection } from '~/composables/useSelection'

interface DenseSection {
  /** null = nessun raggruppamento attivo, nessuna intestazione di sezione. */
  player: string | null
  cards: WantedCard[]
}

const {
  sections, contextMenuItems, selection
} = defineProps<{
  sections: DenseSection[]
  contextMenuItems: (card: WantedCard) => DropdownMenuItem[]
  selection: Selection<number>
}>()

const hasCards = computed(() => sections.some(section => section.cards.length))

// Anchors the guided tour's "anatomy of a card" step (see GridView.vue's
// own comment) on the first rendered card, whatever the active
// section/grouping is — dense is the default view now, so this needs the
// same anchor GridView.vue's own cards carry.
const firstCardId = computed(() => sections.flatMap(section => section.cards)[0]?.id)

// Same shift-click range convention as GridView.vue's own — every currently
// rendered card, flattened across sections in the same order they're drawn.
const range = computed(() => sections.flatMap(section => section.cards).map(card => card.id))

const lastClickShiftKey = ref(false)
</script>

<template>
  <EmptyState
    v-if="!hasCards"
    :message="$t('wantedCard.grid.empty')"
  />

  <div v-else class="flex flex-col gap-6">
    <div v-for="section in sections" :key="section.player ?? '__ungrouped'">
      <div v-if="section.player" class="flex items-center gap-1.5 mb-2">
        <AssociateTag :name="section.player" />
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ section.cards.length }}
        </UBadge>
      </div>

      <!-- Same auto-fill technique as GridView.vue's own grid, just a much
           smaller minimum tile width for real density. -->
      <div class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(min(190px,40vw),1fr))]">
        <WantedCardsListDenseCard
          v-for="card in section.cards"
          :key="card.id"
          v-model:last-click-shift-key="lastClickShiftKey"
          :card="card"
          :context-menu-items="contextMenuItems(card)"
          :selection="selection"
          :range="range"
          :is-first-card="card.id === firstCardId"
          :grouped-by-player="!!section.player"
        />
      </div>
    </div>
  </div>
</template>
