<!-- app\components\magic\CardPreviewTooltip.vue -->

<!--
  Nome carta che mostra l'immagine al passaggio del mouse, o a schermo intero
  col tap su mobile. Sottile specializzazione di CardHoverPreview.vue: qui il
  trigger è sempre il nome della carta, stilato come un link — il resto
  (tracciamento del puntatore, tooltip, modale mobile) sta lì.
-->
<script setup lang="ts">
const { name, imageUrl } = defineProps<{
  name: string
  imageUrl?: string | null
}>()

const { isMobile } = useDevice()
</script>

<template>
  <MagicCardHoverPreview
    :image-url="imageUrl"
    :alt="name"
    mobile-modal
    class="text-primary font-medium"
    :class="isMobile ? 'cursor-pointer underline' : 'cursor-help hover:underline'"
  >
    <slot>{{ name }}</slot>
  </MagicCardHoverPreview>
</template>
