<!-- app\components\tour\Spotlight.vue -->
<script setup lang="ts">
import type { UseTourReturn } from '@nuxt/ui/composables'

const { tour } = defineProps<{ tour: UseTourReturn }>()
const { spotlightStyle } = useTourSpotlight(tour)
</script>

<template>
  <Teleport to="body">
    <!-- z-10: UPopover's content has z-index:auto by default (no explicit
         stacking), so this fixed/teleported overlay would otherwise paint
         above it. The consuming UPopover must set :ui="{ content: 'z-20' }"
         (any value higher than this one) to stay visible over the dim. -->
    <div
      v-if="tour.open.value"
      class="fixed z-10 rounded-lg pointer-events-none transition-all duration-200"
      :style="spotlightStyle"
    />
  </Teleport>
</template>
