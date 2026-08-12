<!-- app\pages\(public)\rankings\premodern\index.vue -->
<script lang="ts" setup>
// Public counterpart to pages/(competitions)/standings/premodern/index.vue —
// see rankings/cittadino/index.vue for why this is a distinct URL.
definePageMeta({ layout: 'public-wide' })
</script>

<template>
  <StandingsPublicFormatPage format="premodern" />
</template>
