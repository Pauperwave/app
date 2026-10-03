<!-- app\components\associates\list\FormSection.vue -->
<!-- Same shell as locations/list/FormSection.vue ("<h3 title> + spaced field list" per
     section), extracted so AddModal.vue/EditModal.vue stop stacking one full-width section at a
     time (see FormFields.vue for the two-column layout this enables) -->
<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-primary">
      {{ title }}
    </h3>
    <div class="space-y-2 mt-2">
      <slot />
    </div>
  </div>
</template>
