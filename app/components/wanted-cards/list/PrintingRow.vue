<!-- app\components\wanted-cards\list\PrintingRow.vue -->

<!-- Row of the "Edizione" dropdown in AddModal.vue/EditModal.vue. The hover preview lives
     entirely in MagicCardHoverPreview: only the row content stays here. -->
<script setup lang="ts">
interface Props {
  label: string
  collectorNumber: string
  imageUrl?: string | null
  cardmarketPrice?: number | null
  // undefined = still loading (see loadCardtraderPrices in AddModal.vue) —
  // distinct from null (no listing found), but WantedCardsPrices shows "—" for
  // both: a dedicated loading UI is not worth it for a best-effort preview.
  cardtraderPrice?: number | null
}

const {
  label, collectorNumber, imageUrl, cardmarketPrice = null, cardtraderPrice = null
} = defineProps<Props>()
</script>

<template>
  <MagicCardHoverPreview
    :image-url="imageUrl"
    :alt="label"
    class="flex items-center gap-1.5"
  >
    <span>{{ label }}</span>
    <span class="text-muted">#{{ collectorNumber }}</span>
    <WantedCardsPrices
      class="ms-auto"
      :cardmarket-price="cardmarketPrice"
      :cardtrader-price="cardtraderPrice"
    />
  </MagicCardHoverPreview>
</template>
