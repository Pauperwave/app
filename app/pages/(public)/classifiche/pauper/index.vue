<!-- app\pages\(public)\classifiche\pauper\index.vue -->
<script lang="ts" setup>
// Public counterpart to pages/(competitions)/standings/pauper/index.vue —
// see classifiche/cittadino/index.vue for why this is a distinct URL.
definePageMeta({ layout: 'public-wide' })
</script>

<template>
  <PublicFormatPage format="pauper" />
</template>
