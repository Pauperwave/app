<!-- app\components\wanted-cards\list\DenseCard.vue -->
<!--
  Single tile for DenseView.vue's dense grid — same selection/context-menu/
  shift-click convention as GridCard.vue, just a much smaller UCard (image +
  player only when ungrouped, image alone when grouped — name/price/meta
  badges/notes/age all dropped 2026-08-29 per user feedback: too cramped at
  this tile size, the art alone identifies the card densely enough) so many
  more fit per screen (user request, 2026-08-29: "usa multiple UCard,
  sempre una griglia").
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  card, contextMenuItems, selection, range, groupedByPlayer
} = defineProps<{
  card: WantedCard
  contextMenuItems: DropdownMenuItem[]
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see DenseView.vue. */
  range: number[]
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
      :ui="{ body: 'p-0 sm:p-0', footer: 'p-1.5 sm:p-1.5' }"
      class="overflow-hidden relative group"
      @click="onCardClick"
    >
      <UCheckbox
        :model-value="selection.isSelected(card.id)"
        size="sm"
        class="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        :class="{ 'opacity-100!': selection.isSelected(card.id) }"
        :ui="{ base: 'bg-default/90 rounded' }"
        :aria-label="$t('common.selectRow')"
        @update:model-value="() => selection.toggle(
          card.id, { shiftKey: lastClickShiftKey, range }
        )"
        @click.stop="lastClickShiftKey = $event.shiftKey"
      />

      <img
        v-if="card.imageUrl"
        :src="card.imageUrl"
        :alt="card.cardName"
        class="w-full aspect-5/7 object-cover"
        loading="lazy"
      >
      <div v-else class="w-full aspect-5/7 bg-elevated flex items-center justify-center">
        <UIcon name="i-lucide-image-off" class="size-5 text-muted" />
      </div>

      <!-- Card name dropped 2026-08-29 (user feedback) — the art alone
           identifies it densely enough, same reasoning as the price drop
           above. Footer only rendered at all when there's still something
           to show: ungrouped, the player name; grouped, nothing (already
           in the section header), so no empty padding block. -->
      <template v-if="!groupedByPlayer" #footer>
        <AssociateTag :name="card.player" size="xs" />
      </template>
    </UCard>
  </UContextMenu>
</template>
