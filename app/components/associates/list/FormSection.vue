<!-- app\components\associates\list\FormSection.vue -->
<!-- Same shell as locations/list/FormSection.vue — "<h3 title> + spaced field
     list" repeated once per section, extracted here for the same reason
     (2026-08-19, user request: AddModal.vue/EditModal.vue had grown too tall
     stacking a full-width section at a time — see FormFields.vue's own
     comment for the two-column layout this enables). -->
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
