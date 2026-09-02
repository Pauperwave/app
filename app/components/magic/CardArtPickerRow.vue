<!-- app\components\magic\CardArtPickerRow.vue -->
<!--
  Row for CardArtPicker.vue's printing USelectMenu — same shape as
  wanted-cards/list/PrintingRow.vue (set name + collector number, hover
  preview via MagicCardHoverPreview) minus the CardTrader/Cardmarket price
  pair, which makes no sense when picking cover art rather than a card to
  buy.
-->
<script setup lang="ts">
interface Props {
  label: string
  collectorNumber: string
  imageUrl?: string | null
}

const { label, collectorNumber, imageUrl } = defineProps<Props>()
</script>

<template>
  <MagicCardHoverPreview
    :image-url="imageUrl"
    :alt="label"
    class="flex items-center gap-1.5"
  >
    <span>{{ label }}</span>
    <span class="text-muted">#{{ collectorNumber }}</span>
  </MagicCardHoverPreview>
</template>
