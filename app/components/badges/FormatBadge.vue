<!-- app\components\badges\FormatBadge.vue -->
<!-- Single source of truth for the "format" badge's color (Commander, Pauper, Draft, ...):
     shared/utils/formatColors.ts's tint, applied by overriding --ui-primary locally rather than
     a Tailwind class. This app's semantic color tokens are Tailwind v4 theme values that
     tailwind-merge doesn't see as conflicting, so `:class="formatColorClass(...)"` on a plain
     UBadge left the variant="subtle" compound's bg-primary/10 and ring-primary/25 beside it.
     Every `subtle` utility (bg-primary/*, text-primary, ring-primary/*) reads --ui-primary, so
     overriding that one property repaints bg/text/ring consistently, with no class conflict.
     Centralized after this pattern was copy-pasted across four files
     (tournaments/list/Card.vue, calendar/card/Tournament.vue, calendar/card/Event.vue,
     calendar/DetailSlideover.vue), whose copies had started drifting. -->
<script setup lang="ts">
const { format, icon } = defineProps<{
  format: string
  icon?: string
}>()

const { formatColor } = useFormatColor()

const colorStyle = computed(() => {
  const color = formatColor(format)
  return color ? { '--ui-primary': color } : undefined
})
</script>

<template>
  <UBadge
    variant="subtle"
    :icon="icon"
    :style="colorStyle"
  >
    {{ format }}
  </UBadge>
</template>
