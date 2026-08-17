<!-- app\components\ui\ImageOffPlaceholder.vue -->
<!--
  Shared "no cover image" fallback (2026-08-16) — replaces the old shared
  DEFAULT_CALENDAR_COVER_IMAGE placeholder photo across calendar/tournaments/
  leagues cover spots. No sizing classes of its own: the caller supplies
  the footprint (e.g. `class="w-full h-32"`, `class="size-20"`) the `<img>`
  it stands in for would otherwise have had.
-->
<script setup lang="ts">
const {
  iconClass = 'size-8'
} = defineProps<{
  iconClass?: string
}>()
</script>

<template>
  <div class="flex items-center justify-center bg-elevated">
    <UIcon
      :name="ICONS.imageOff"
      :class="[iconClass, 'text-muted']"
    />
  </div>
</template>
