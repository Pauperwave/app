<!-- app\components\magic\CardPreviewTooltip.vue -->

<!-- A card name that shows the image on hover, or full screen on tap on mobile. A thin
     specialization of CardHoverPreview.vue: here the trigger is always the card name, styled as
     a link; the rest (pointer tracking, tooltip, mobile modal) lives there. -->
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
