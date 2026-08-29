<!-- app\components\wanted-cards\list\SelectableImage.vue -->
<!--
  Selection checkbox overlay + card image/placeholder, shared by GridCard.vue
  and DenseCard.vue (extracted 2026-08-29, fallow:dupes flagged the two as
  byte-identical aside from size) — a card's own tile always renders this as
  the first thing inside its `relative group` UCard, before whatever footer
  content that tile shows. GridCard.vue's own hover gradient (the dark
  top-down fade behind its checkbox) stays there, not here — DenseCard.vue's
  tile is small enough that the checkbox alone reads fine without it.
-->
<script setup lang="ts">
import type { WantedCard } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  card, selection, range, dense = false
} = defineProps<{
  card: WantedCard
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see the caller's own GridView.vue/DenseView.vue. */
  range: number[]
  /** Smaller checkbox/placeholder icon for DenseCard.vue's tighter tile. */
  dense?: boolean
}>()

const lastClickShiftKey = defineModel<boolean>('lastClickShiftKey', { required: true })
</script>

<template>
  <UCheckbox
    :model-value="selection.isSelected(card.id)"
    :size="dense ? 'sm' : 'xl'"
    class="absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity"
    :class="[
      dense ? 'top-1.5 right-1.5' : 'top-3 right-3',
      { 'opacity-100!': selection.isSelected(card.id) }
    ]"
    :ui="{ base: 'bg-default/90 rounded' }"
    :aria-label="$t('common.selectRow')"
    @update:model-value="() => selection.toggle(
      card.id, { shiftKey: lastClickShiftKey, range }
    )"
    @click.stop="lastClickShiftKey = $event.shiftKey"
  />

  <NuxtImg
    v-if="card.imageUrl"
    :src="card.imageUrl"
    :alt="card.cardName"
    :width="dense ? 190 : 280"
    :height="dense ? 266 : 392"
    format="webp"
    class="w-full aspect-5/7 object-cover"
    loading="lazy"
  />
  <div v-else class="w-full aspect-5/7 bg-elevated flex items-center justify-center">
    <UIcon name="i-lucide-image-off" :class="dense ? 'size-5' : 'size-8'" class="text-muted" />
  </div>
</template>
