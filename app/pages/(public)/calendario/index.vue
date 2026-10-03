<!-- app\pages\(public)\calendario\index.vue -->
<script lang="ts" setup>
// Public counterpart to pages/(competitions)/events/index.vue, backing calendario.pauperwave.org
// (settings/domains.vue): see rankings/cittadino/index.vue for why this is a distinct URL from the
// internal /events route. Not /calendar: a distinct word, and that path is still reserved for a
// possible internal dashboard calendar (it was briefly repurposed for this page's content and
// reverted, see docs/PROGRESS.md ADR-011)
definePageMeta({ layout: 'public-wide' })
</script>

<template>
  <PublicCalendarPage />
</template>
