<!-- app\components\wanted-cards\list\DenseCard.vue -->
<!--
  Single tile for DenseView.vue's dense grid — same selection/context-menu/
  shift-click convention as GridCard.vue, just a much smaller UCard (image +
  player (when ungrouped) + prices — card name/meta badges/notes/age
  dropped 2026-08-29 per user feedback: too cramped at this tile size, the
  art alone identifies the card densely enough) so many more fit per screen
  than GridCard.vue's full tiles (user request, 2026-08-29: "usa multiple
  UCard, sempre una griglia").
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  card, contextMenuItems, selection, range, isFirstCard, groupedByPlayer
} = defineProps<{
  card: WantedCard
  contextMenuItems: DropdownMenuItem[]
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see DenseView.vue. */
  range: number[]
  isFirstCard: boolean
  groupedByPlayer: boolean
}>()

const lastClickShiftKey = defineModel<boolean>('lastClickShiftKey', { required: true })

// Same ctrl/cmd/shift-click-anywhere convention as GridCard.vue's own.
function onCardClick(event: MouseEvent) {
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) return
  selection.toggle(card.id, { shiftKey: event.shiftKey, range })
}
</script>

<template>
  <UContextMenu :items="contextMenuItems">
    <UCard
      :id="isFirstCard ? 'tour-wanted-cards-first-card' : undefined"
      :ui="{ body: 'p-0 sm:p-0', footer: 'p-1.5 sm:p-1.5' }"
      class="overflow-hidden relative group"
      @click="onCardClick"
    >
      <WantedCardsListSelectableImage
        v-model:last-click-shift-key="lastClickShiftKey"
        :card="card"
        :selection="selection"
        :range="range"
        dense
      />

      <!-- Card name dropped 2026-08-29 (user feedback) — the art alone
           identifies it densely enough. Prices re-added just below the
           player name the same day, once the tile grew from 140px to 190px
           and had room again ("metti i prezzi sotto al nome"). -->
      <template #footer>
        <AssociateTag
          v-if="!groupedByPlayer"
          :name="card.player"
          size="xs"
          class="mb-0.5"
        />
        <WantedCardsPrices
          :cardmarket-price="card.cardmarketPrice"
          :cardtrader-price="card.cardtraderPrice"
        />
      </template>
    </UCard>
  </UContextMenu>
</template>
