<!-- app\components\calendar\DetailFact.vue -->
<!-- One line of a calendar detail's facts: an icon and its text. -->
<script setup lang="ts">
defineProps<{ icon: string }>()
</script>

<template>
  <p class="flex items-center gap-2">
    <UIcon :name="icon" class="size-5 shrink-0" />
    <slot />
  </p>
</template>
