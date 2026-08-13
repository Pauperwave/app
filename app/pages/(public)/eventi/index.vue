<!-- app\pages\(public)\eventi\index.vue -->
<script lang="ts" setup>
// Public counterpart to pages/(competitions)/events/index.vue, backing
// eventi.pauperwave.org (settings/domains.vue) — see rankings/cittadino/
// index.vue for why this is a distinct URL from the internal /events route.
definePageMeta({ layout: 'public-wide' })
</script>

<template>
  <EventsPublicCalendarPage />
</template>
