<!-- app\components\ui\ImageOffPlaceholder.vue -->
<!-- Shared "no cover image" fallback replacing the old DEFAULT_CALENDAR_COVER_IMAGE placeholder
     photo across calendar/tournaments/leagues cover spots. No sizing classes of its own: the
     caller supplies the footprint (e.g. `class="w-full h-32"`, `class="size-20"`) of the
     `<img>` it stands in for. -->
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
