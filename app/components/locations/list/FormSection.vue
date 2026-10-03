<!-- app\components\locations\list\FormSection.vue -->
<!-- Extracted from AddModal.vue/EditModal.vue (fallow:dupes flagged their two-column section
     layout as a 36-line clone): just the "<h3 title> + spaced field list" shell repeated per
     section (Informazioni generali, Posizione, Contatti, Orari di apertura, Social). -->
<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-primary">
      {{ title }}
    </h3>
    <!-- space-y-2, not -4: -4 read as too spacious beside the associates modal's sections -->
    <div class="space-y-2 mt-2">
      <slot />
    </div>
  </div>
</template>
