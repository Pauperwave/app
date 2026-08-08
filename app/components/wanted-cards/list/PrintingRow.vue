<!-- app\components\wanted-cards\list\PrintingRow.vue -->

<!--
  Riga della tendina "Edizione" in AddModal.vue/EditModal.vue. L'anteprima al
  passaggio del mouse è tutta in MagicCardHoverPreview: qui resta solo il
  contenuto della riga.
-->
<script setup lang="ts">
interface Props {
  label: string
  collectorNumber: string
  imageUrl?: string | null
  cardmarketPrice?: number | null
  // undefined = ancora in caricamento (vedi loadCardtraderPrices in
  // AddModal.vue) — distinto da null (nessuna inserzione trovata), ma
  // WantedCardsPrices mostra "—" per entrambi: non vale la pena una UI di
  // loading dedicata per un'anteprima best-effort.
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
