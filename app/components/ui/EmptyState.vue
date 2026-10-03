<!-- app\components\ui\EmptyState.vue -->
<!-- The "nothing to show" placeholder (a centered muted message) repeated across grid views,
     detail pages and slideovers/dropdowns, differing only in the message text (the same
     "identical wrapper, one varying string" shape as TourStartButton). -->
<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>

<template>
  <div class="text-center py-12 text-muted">
    {{ message }}
  </div>
</template>
