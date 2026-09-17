<!-- app\components\tournaments\single\pairing\CommanderCardPreview.vue -->
<!--
  Full front(+back, if double-faced) card art preview for the commander
  search box — ported bit-by-bit from MagicTheGathering/league's
  CardPreview.vue (user request 2026-09-16). Named CommanderCardPreview
  (not CardPreview) to avoid colliding with app/components/magic/
  CardPreview.vue, which previews a wanted-card ScryfallPrinting — a
  different shape from CommanderCard.
-->
<script setup lang="ts">
import type { CommanderCard } from '~/composables/commanders/useCommanderCards'

const props = defineProps<{
  card: CommanderCard | null
}>()

const isDoubleFaced = computed(() => props.card?.isDoubleFaced ?? false)

const colorBgClass = computed(() => {
  if (!props.card) return ''
  return buildGradientStyle(resolveCardColors(props.card))
})

const frontImage = computed(() => props.card?.largeImageUrl ?? null)

const backImage = computed(() => {
  if (!isDoubleFaced.value) return null
  return props.card?.backLargeImageUrl ?? null
})
</script>

<template>
  <!-- Always rendered (opacity-toggled, not v-if) so this block reserves its
       exact footprint — mt-4 + p-4 + a w-64 card at its real 5:7 aspect
       ratio (358px tall) — whether or not a card is selected yet, instead of
       the modal jumping in height the moment a commander gets picked. -->
  <div
    class="mt-4 p-4 rounded-lg shadow-lg flex gap-4 justify-center transition-opacity"
    :class="card ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    :style="{ background: colorBgClass }"
  >
    <div class="w-64 aspect-5/7">
      <NuxtImg
        v-if="frontImage"
        :src="frontImage"
        :alt="card?.name"
        class="size-full rounded-lg shadow-xl object-cover"
        loading="lazy"
      />
    </div>
    <div v-if="isDoubleFaced" class="w-64 aspect-5/7">
      <NuxtImg
        v-if="backImage"
        :src="backImage"
        :alt="(card?.name ?? '') + ' (back)'"
        class="size-full rounded-lg shadow-xl object-cover"
        loading="lazy"
      />
    </div>
  </div>
</template>
