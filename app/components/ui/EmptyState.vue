<!-- app\components\ui\EmptyState.vue -->
<!--
  The "nothing to show" placeholder (a centered muted message) repeated
  byte-identically across grid views, detail pages, and slideovers/dropdowns
  — only the message text differed (previously copy-pasted 16 times,
  extracted 2026-08-30, same "identical wrapper, one varying string" shape as
  TourStartButton).
-->
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
