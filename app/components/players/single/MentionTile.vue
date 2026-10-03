<!-- app\components\players\single\MentionTile.vue -->
<!-- One special mention on a player's page: its icon in a tinted circle, the label and how many
     times, and an optional slot for the details (the decks that earned it). Tinted and bordered so
     it reads as an award, unlike the plain numbers of StatsCard.vue. -->
<script setup lang="ts">
interface Props {
  icon: string
  label: string
  count: number
  color: 'error' | 'neutral' | 'success' | 'warning'
}

const {
  icon,
  label,
  count,
  color
} = defineProps<Props>()

// Spelled out per color (not built from a template string) so Tailwind's static class scan finds
// them: an interpolated `border-${color}/30` wouldn't survive the production build
const TILE_CLASSES: Record<Props['color'], string> = {
  error: 'border-error/30 bg-error/5',
  neutral: 'border-default bg-elevated/50',
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5'
}
const ICON_CLASSES: Record<Props['color'], string> = {
  error: 'bg-error/15 text-error',
  neutral: 'bg-muted text-muted',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning'
}
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-lg border p-4"
    :class="TILE_CLASSES[color]"
  >
    <div class="flex items-center gap-3">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full"
        :class="ICON_CLASSES[color]"
      >
        <UIcon :name="icon" class="size-5" />
      </span>
      <div>
        <p class="text-xs uppercase text-muted">
          {{ label }}
        </p>
        <p class="text-2xl font-semibold leading-tight">
          {{ count }}
        </p>
      </div>
    </div>

    <slot />
  </div>
</template>
