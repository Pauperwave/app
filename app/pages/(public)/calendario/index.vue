<!-- app\pages\(public)\calendario\index.vue -->
<script lang="ts" setup>
// Public counterpart to pages/(competitions)/events/index.vue, backing
// calendario.pauperwave.org (settings/domains.vue) — see rankings/cittadino/
// index.vue for why this is a distinct URL from the internal /events route.
// Not /calendar: distinct word ("calendario" vs "calendar"), but the /calendar
// path itself is still reserved for a possible future internal dashboard
// calendar (was briefly repurposed for this page's content 2026-08-13,
// reverted the same day — see docs/PROGRESS.md ADR-011). Moved here from
// /eventi 2026-08-14 at the user's request, alongside the eventi.pauperwave.org
// -> calendario.pauperwave.org subdomain rename.
definePageMeta({ layout: 'public-wide' })
</script>

<template>
  <EventsPublicCalendarPage />
</template>
