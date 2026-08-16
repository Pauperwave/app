<!-- app\components\tournaments\list\LeagueLink.vue -->
<!--
  Extracted out of Card.vue (2026-08-16) — same "single source of truth"
  reasoning as FormatBadge.vue/LocationBadge.vue, though this one isn't a
  UBadge: it's a text link under the title, not a pill in the badges row.
-->
<script setup lang="ts">
const { league, leagueUuid } = defineProps<{
  league: string | null
  leagueUuid: string | null
}>()
</script>

<template>
  <!-- Always rendered (not v-if on this wrapper) at a fixed h-4 — reserves
       the line's height even for a standalone tournament with no league, so
       cards in the same grid row stay the same height instead of the ones
       without a league sitting shorter. -->
  <div class="h-4">
    <!-- Explicit block/w-full/p-0/border-0/leading-4: a bare <button> is
         inline-block with browser-default padding/border (Tailwind's
         preflight doesn't zero those out), which renders a hair taller than
         the h-4 wrapper otherwise. w-full + text-start is also what lets
         `truncate` actually have a width to ellipsis against, instead of
         shrink-wrapping the button to its text. -->
    <button
      v-if="league && leagueUuid"
      type="button"
      class="block w-full text-start p-0 m-0 border-0 bg-transparent leading-4
        text-xs text-muted hover:text-default cursor-pointer truncate"
      @click.stop="navigateTo(`/leagues/${leagueUuid}`)"
    >
      {{ league }}
    </button>
  </div>
</template>
