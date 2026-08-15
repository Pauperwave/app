<!-- app\pages\(public)\rankings\cittadino\index.vue -->
<script lang="ts" setup>
// Public counterpart to pages/(competitions)/standings/cittadino/index.vue —
// backs cittadino.pauperwave.org (settings/domains.vue), a distinct URL
// (/rankings/cittadino, not /standings/cittadino) so it doesn't collide with
// the internal dashboard route of the same data, still reachable from
// layouts/default.vue's sidebar for logged-in staff.
definePageMeta({ layout: 'public-wide' })
</script>

<template>
  <PublicCittadinoPage />
</template>
