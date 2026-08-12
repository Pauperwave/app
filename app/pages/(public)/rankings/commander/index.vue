<!-- app\pages\(public)\rankings\commander\index.vue -->
<script lang="ts" setup>
// Public counterpart to pages/(competitions)/standings/commander/index.vue —
// see rankings/cittadino/index.vue for why this is a distinct URL.
definePageMeta({ layout: 'public-wide' })
</script>

<template>
  <StandingsPublicFormatPage format="commander" />
</template>
