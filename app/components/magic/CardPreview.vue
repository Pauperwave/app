<!-- app\components\magic\CardPreview.vue -->

<!--
  Stesso meccanismo di CardPreview.vue in MagicTheGathering/league (sezione
  comandante): anteprima sempre visibile sotto il selettore di edizione, non
  un tooltip/modale a comparsa — mostra fronte (e retro, se la carta è a due
  facce) con uno sfondo a gradiente derivato dai colori della carta.
-->
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
  <!-- Always mounted (fading opacity, not v-if): it always reserves its space —
       a w-64 image at a true 5:7 ratio (358px tall) — whether or not an edition
       is selected, so the modal does not jump in height the moment one is
       chosen. -->
  <div
    class="mt-4 p-4 rounded-lg shadow-lg flex gap-4 justify-center transition-opacity"
    :class="printing ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    :style="{ background: gradientStyle }"
  >
    <div class="w-64 aspect-5/7">
      <img
        v-if="printing?.imageUrl"
        :src="printing.imageUrl"
        :alt="printing.name"
        class="size-full rounded-lg shadow-xl object-cover"
        loading="lazy"
      >
    </div>
    <div v-if="printing?.isDoubleFaced" class="w-64 aspect-5/7">
      <img
        v-if="printing.backImageUrl"
        :src="printing.backImageUrl"
        :alt="`${printing.name} (retro)`"
        class="size-full rounded-lg shadow-xl object-cover"
        loading="lazy"
      >
    </div>
  </div>
</template>
