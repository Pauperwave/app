<!-- app\components\locations\list\FormSection.vue -->
<!--
  Extracted out of AddModal.vue/EditModal.vue (2026-08-16, fallow:dupes
  flagged their two-column section layout as a 36-line clone) — just the
  "<h3 title> + spaced field list" shell repeated once per section
  (Informazioni generali, Posizione, Contatti, Orari di apertura, Social).
-->
<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-primary">
      {{ title }}
    </h3>
    <div class="space-y-4 mt-2">
      <slot />
    </div>
  </div>
</template>
