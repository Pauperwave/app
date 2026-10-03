<!-- app\components\magic\CardPreview.vue -->

<!-- The same mechanism as league's CardPreview.vue (commander section): a preview always
     visible under the edition selector, not a tooltip/modal that pops up, showing the front
     (and back, for a double-faced card) on a gradient background derived from the card's
     colors. -->
<script setup lang="ts">
import type { ScryfallPrinting } from '~/composables/useScryfallCardSearch'

const { printing } = defineProps<{
  printing: ScryfallPrinting | null
}>()

const gradientStyle = computed(() => {
  if (!printing) return undefined
  return buildGradientStyle(resolveCardColors(printing))
})
</script>

<template>
  <!-- Always mounted (fading opacity, not v-if): it reserves its space (a w-64 image at a true
       5:7 ratio, 358px tall) whether or not an edition is selected, so the modal doesn't jump
       in height when one is chosen -->
  <div
    class="mt-4 p-4 rounded-lg shadow-lg flex gap-4 justify-center transition-opacity"
    :class="printing ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    :style="{ background: gradientStyle }"
  >
    <div class="w-64 aspect-5/7">
      <NuxtImg
        v-if="printing?.imageUrl"
        :src="printing.imageUrl"
        :alt="printing.name"
        format="webp"
        width="256"
        height="358"
        class="size-full rounded-lg shadow-xl object-cover"
        loading="lazy"
      />
    </div>
    <div v-if="printing?.isDoubleFaced" class="w-64 aspect-5/7">
      <NuxtImg
        v-if="printing.backImageUrl"
        :src="printing.backImageUrl"
        :alt="`${printing.name} (retro)`"
        format="webp"
        width="256"
        height="358"
        class="size-full rounded-lg shadow-xl object-cover"
        loading="lazy"
      />
    </div>
  </div>
</template>
