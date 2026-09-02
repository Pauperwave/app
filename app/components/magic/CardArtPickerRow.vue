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
  <!-- previewWidth/Height: art_crop is a landscape crop (~626x457, unlike
       the portrait full-card image MagicCardHoverPreview defaults to) —
       without an override here NuxtImg crops/zooms it to fit the default
       portrait box instead of showing the actual illustration (found
       2026-09-02, right after the printing-selector rewrite). -->
  <MagicCardHoverPreview
    :image-url="imageUrl"
    :alt="label"
    :preview-width="280"
    :preview-height="204"
    class="flex items-center gap-1.5"
  >
    <span>{{ label }}</span>
    <span class="text-muted">#{{ collectorNumber }}</span>
  </MagicCardHoverPreview>
</template>
