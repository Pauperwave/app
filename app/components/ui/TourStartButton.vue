<!-- app\components\ui\TourStartButton.vue -->
<!-- The "Tour guidato" button every list/detail page's navbar #right shows to (re-)start its
     TourGuide: the same icon/color/variant everywhere, only the label and click target differ
     (it was copy-pasted across 10 files). The label collapses to icon-only below `lg`, like
     ColumnVisibilityMenu.vue's "Mostra colonne" button. -->
<script setup lang="ts">
interface Props {
  label: string
}

defineProps<Props>()
defineEmits<{ start: [] }>()
</script>

<template>
  <!-- text: undefined above `lg`: the label is already visible there, so a tooltip repeating it
       would be redundant (it only helps once it collapses to icon-only below `lg`) -->
  <UTooltip :text="label" :ui="{ content: 'lg:hidden' }">
    <UButton
      :icon="ICONS.helpCircle"
      color="neutral"
      variant="ghost"
      :aria-label="label"
      @click="$emit('start')"
    >
      <span class="hidden lg:inline">{{ label }}</span>
    </UButton>
  </UTooltip>
</template>
