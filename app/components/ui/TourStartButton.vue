<!-- app\components\ui\TourStartButton.vue -->
<!--
  The "Tour guidato" button every list/detail page's navbar #right shows to
  (re-)start its own TourGuide — same icon/color/variant everywhere, only the
  label and click target differ (previously copy-pasted identically across
  10 files, extracted 2026-08-30). Label collapses to icon-only below `lg`,
  same convention as ColumnVisibilityMenu.vue's own "Mostra colonne" button.
-->
<script setup lang="ts">
interface Props {
  label: string
}

defineProps<Props>()
defineEmits<{ start: [] }>()
</script>

<template>
  <UButton
    icon="i-lucide-circle-help"
    color="neutral"
    variant="ghost"
    @click="$emit('start')"
  >
    <span class="hidden lg:inline">{{ label }}</span>
  </UButton>
</template>
