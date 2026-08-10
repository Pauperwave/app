<!-- app\components\wanted-cards\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'

interface GridSection {
  /** null = nessun raggruppamento attivo, nessuna intestazione di sezione. */
  player: string | null
  cards: WantedCard[]
}

const { sections, contextMenuItems, showStatus = false } = defineProps<{
  sections: GridSection[]
  contextMenuItems: (card: WantedCard) => DropdownMenuItem[]
  /** Show the status badge (Found/Searching) — only when the active tab is "All", where the filter would otherwise not make it clear. */
  showStatus?: boolean
}>()

const { t } = useI18n()

const hasCards = computed(() => sections.some(section => section.cards.length))

// Anchors the guided tour's "anatomy of a card" step (see useTour in
// wanted-cards/index.vue) on the first rendered card, whatever the active
// section/grouping is.
const firstCardId = computed(() => sections.flatMap(section => section.cards)[0]?.id)
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
        <UContextMenu
          v-for="card in section.cards"
          :key="card.id"
          :items="contextMenuItems(card)"
        >
          <UCard
            :id="card.id === firstCardId ? 'tour-wanted-cards-first-card' : undefined"
            :ui="{ body: 'p-0 sm:p-0', footer: 'p-3 sm:p-3' }"
            class="overflow-hidden"
          >
            <img
              v-if="card.imageUrl"
              :src="card.imageUrl"
              :alt="card.cardName"
              class="w-full aspect-[5/7] object-cover"
            >
            <div v-else class="w-full aspect-[5/7] bg-elevated flex items-center justify-center">
              <UIcon name="i-lucide-image-off" class="size-8 text-muted" />
            </div>

            <template #footer>
              <!-- Single row when grouped by player: without PlayerTag (already
                   in the section header) the first row would otherwise hold
                   just the price, wasting space. Ungrouped, both rows are
                   already full, so they stay separate. -->
              <div v-if="section.player" class="flex flex-wrap items-center gap-1.5">
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
                    <PlayerTag v-if="!section.player" :name="card.player" />
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
      </div>
    </div>
  </div>
</template>
