<!-- app\components\badges\FormatBadge.vue -->
<!--
  Single source of truth for the "format" badge's colour (Commander, Pauper,
  Draft, ...) — shared/utils/formatColors.ts's tint, applied by overriding
  --ui-primary locally rather than passing a Tailwind class. This app's
  semantic colour tokens (primary/success/...) are Tailwind v4 theme values
  that tailwind-merge's default config doesn't recognise as conflicting with
  each other, so `:class="formatColorClass(...)"` on a plain UBadge left the
  variant="subtle" compound's own bg-primary/10 and ring-primary/25 in place
  alongside it. Every `subtle`-variant utility (bg-primary/*, text-primary,
  ring-primary/*) reads from --ui-primary, so overriding just that one
  custom property repaints bg/text/ring consistently, no class conflict to
  resolve.

  Centralized here (2026-08-16) after this exact pattern was copy-pasted
  across four files (tournaments/list/Card.vue, calendar/card/Tournament.vue,
  calendar/card/Event.vue, calendar/DetailSlideover.vue) — the copies had
  already started drifting from each other.
-->
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
  <UBadge variant="subtle" :icon="icon" :style="colorStyle">
    {{ format }}
  </UBadge>
</template>
