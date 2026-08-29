<!-- app\components\wanted-cards\list\GridCard.vue -->
<!--
  Extracted out of GridView.vue's per-card v-for body (2026-08-16,
  fallow:health flagged GridView.vue's whole <template> as high-complexity —
  almost all of it was this card's own branching: image-vs-placeholder, and
  two different footer layouts depending on whether the grid is grouped by
  player). GridView.vue now only owns the section/grid layout.

  lastClickShiftKey is v-model'd, not owned here: every card in the grid
  shares ONE ref (GridView.vue's own), the same way useGroupedSelectColumn.ts
  keeps it module-scoped to the whole column rather than per-cell — a
  per-card ref here would break shift-click ranging across different cards.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  card, contextMenuItems, selection, range, isFirstCard, groupedByPlayer, showStatus = false
} = defineProps<{
  card: WantedCard
  contextMenuItems: DropdownMenuItem[]
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range: number[]
  isFirstCard: boolean
  groupedByPlayer: boolean
  showStatus?: boolean
}>()

const { t } = useI18n()

const lastClickShiftKey = defineModel<boolean>('lastClickShiftKey', { required: true })

// Ctrl/Cmd+click or shift+click anywhere on the card toggles/range-selects —
// same modifier convention as a file manager, lets a visitor select without
// having to land precisely on the (small, hover-revealed) checkbox. Purely
// additive: this card has no other whole-card click behavior to conflict
// with. A shift-click here ranges from whatever card was last toggled (by
// either method), so a Ctrl+click to pick the first card still anchors a
// following Shift+click elsewhere on the grid.
function onCardClick(event: MouseEvent) {
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) return
  selection.toggle(card.id, { shiftKey: event.shiftKey, range })
}
</script>

<template>
  <UContextMenu :items="contextMenuItems">
    <UCard
      :id="isFirstCard ? 'tour-wanted-cards-first-card' : undefined"
      :ui="{ body: 'p-0 sm:p-0', footer: 'p-3 sm:p-3' }"
      class="overflow-hidden relative group"
      @click="onCardClick"
    >
      <!-- Hidden until hover, except once selected — same "stays visible
           once acted on" reasoning as the header/group checkboxes in
           useWantedCardsTableColumns.ts. No touch/hover fallback for
           mobile yet (selection starts from the table there instead) —
           see docs/TODO.md if that becomes a real need. A dark top-down
           gradient fades in alongside the checkbox (same opacity/
           selected-state logic) so it stays legible over busy card art
           instead of relying solely on its own background pill. -->
      <div
        class="absolute inset-x-0 top-0 h-20 z-10 bg-linear-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        :class="{ 'opacity-100!': selection.isSelected(card.id) }"
      />
      <WantedCardsListSelectableImage
        v-model:last-click-shift-key="lastClickShiftKey"
        :card="card"
        :selection="selection"
        :range="range"
      />

      <template #footer>
        <!-- Single row when grouped by player: without AssociateTag (already
             in the section header) the first row would otherwise hold
             just the price, wasting space. Ungrouped, both rows are
             already full, so they stay separate. -->
        <div v-if="groupedByPlayer" class="flex flex-wrap items-center gap-1.5">
          <UTooltip v-if="card.notes" :text="card.notes">
            <UIcon :name="ICONS.messageCircle" class="size-4 text-muted shrink-0" />
          </UTooltip>
          <WantedCardsMetaBadges :card="card" />

          <WantedCardsAge :date="card.date" />

          <div class="flex items-center gap-1.5 ms-auto shrink-0">
            <UTooltip v-if="showStatus" :text="t(`wantedCard.status.${card.status}`)">
              <UBadge
                :color="wantedCardStatusColor(card.status)"
                variant="subtle"
                :icon="WANTED_CARD_STATUS_ICONS[card.status]"
                :aria-label="t(`wantedCard.status.${card.status}`)"
              />
            </UTooltip>
            <WantedCardsPrices
              :cardmarket-price="card.cardmarketPrice"
              :cardtrader-price="card.cardtraderPrice"
            />
          </div>
        </div>

        <div v-else class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-1.5 min-w-0">
              <!-- The player name is already in the section header when
                   grouped: it would be redundant here. -->
              <AssociateTag v-if="!groupedByPlayer" :name="card.player" />
              <UTooltip v-if="card.notes" :text="card.notes">
                <UIcon :name="ICONS.messageCircle" class="size-4 text-muted shrink-0" />
              </UTooltip>
            </div>
            <WantedCardsPrices
              :cardmarket-price="card.cardmarketPrice"
              :cardtrader-price="card.cardtraderPrice"
            />
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <WantedCardsMetaBadges :card="card" />
            <!-- Right-hand cluster as a single flex child, not two
                 siblings with `ms-auto` on the first: with flex-wrap that
                 margin only aligns right while the row does not wrap —
                 afterwards the status badge opened the new row and ended
                 up on the left (obvious with the longest label,
                 "Abbandonata"). Alone on the wrapped row, `ms-auto` keeps
                 pushing the group right. -->
            <div class="flex items-center gap-1.5 ms-auto shrink-0">
              <WantedCardsAge :date="card.date" />
              <UTooltip v-if="showStatus" :text="t(`wantedCard.status.${card.status}`)">
                <UBadge
                  :color="wantedCardStatusColor(card.status)"
                  variant="subtle"
                  :icon="WANTED_CARD_STATUS_ICONS[card.status]"
                  :aria-label="t(`wantedCard.status.${card.status}`)"
                />
              </UTooltip>
            </div>
          </div>
        </div>
      </template>
    </UCard>
  </UContextMenu>
</template>
