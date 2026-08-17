<!-- app\components\badges\LeagueBadge.vue -->
<!--
  A tournament's league as a clickable pill linking to its detail page — same
  "single source of truth" reasoning as FormatBadge.vue/LocationBadge.vue.
  Unlike LocationBadge.vue (an external Maps link, plain <a>), this is an
  internal route, so it follows tournaments/list/LeagueLink.vue's own
  button+navigateTo convention instead.
-->
<script setup lang="ts">
const { league, leagueUuid } = defineProps<{
  league: string
  leagueUuid: string
}>()
</script>

<template>
  <button
    type="button"
    class="inline-flex min-w-0"
    @click.stop="navigateTo(`/leagues/${leagueUuid}`)"
  >
    <UBadge
      color="neutral"
      variant="subtle"
      :icon="ICONS.standings"
      :label="league"
      :ui="{ base: 'min-w-0', label: 'truncate min-w-0' }"
    />
  </button>
</template>
