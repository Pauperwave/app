<!-- app\components\ui\StatCard.vue -->
<!-- The icon+title+value UPageCard shape shared by /statistics'
AssociatesStatsCards.vue and /finance's 5 summary cards — byte-identical
except for the optional color tint, extracted 2026-08-24 rather than kept as
two copies. -->
<script setup lang="ts">
interface Props {
  icon: string
  title: string
  value: string | number
  color?: 'primary' | 'success' | 'error'
}

const {
  icon, title, value, color = 'primary'
} = defineProps<Props>()

// Spelled out per color (rather than built from a template string) so
// Tailwind's static class scan can find them — an interpolated
// `bg-${color}/10` wouldn't survive the production build. Two separate
// slots: `leading` is the circle's background/ring, `leadingIcon` is the
// glyph itself (UPageCard renders it as its own data-slot, not tinted by
// the wrapper's classes — see node_modules/@nuxt/ui's PageCard.vue).
const LEADING_COLOR_CLASSES: Record<NonNullable<Props['color']>, string> = {
  primary: 'bg-primary/10 ring-primary/25',
  success: 'bg-success/10 ring-success/25',
  error: 'bg-error/10 ring-error/25'
}
const LEADING_ICON_COLOR_CLASSES: Record<NonNullable<Props['color']>, string> = {
  primary: 'text-primary',
  success: 'text-success',
  error: 'text-error'
}
</script>

<template>
  <UPageCard
    :icon="icon"
    :title="title"
    variant="subtle"
    :ui="{
      container: 'gap-y-1.5',
      wrapper: 'items-start',
      leading: `p-2.5 rounded-full ring ring-inset flex-col ${LEADING_COLOR_CLASSES[color]}`,
      leadingIcon: LEADING_ICON_COLOR_CLASSES[color],
      title: 'font-normal text-muted text-xs uppercase'
    }"
    class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
  >
    <span class="text-2xl font-semibold text-highlighted">{{ value }}</span>
  </UPageCard>
</template>
