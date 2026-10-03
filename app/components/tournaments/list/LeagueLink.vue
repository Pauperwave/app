<!-- app\components\tournaments\list\LeagueLink.vue -->
<!-- Extracted from Card.vue, with the same "single source of truth" reasoning as
     FormatBadge.vue/LocationBadge.vue, though this isn't a UBadge: it is a text link under the
     title, not a pill in the badges row. -->
<script setup lang="ts">
const { league, leagueUuid } = defineProps<{
  league: string | null
  leagueUuid: string | null
}>()
</script>

<template>
  <!-- Always rendered (not v-if on this wrapper) at a fixed h-4: reserves the line's height
       even for a standalone tournament with no league, so cards in a grid row stay the same
       height -->
  <div class="h-4">
    <!-- Explicit block/w-full/p-0/border-0/leading-4: a bare <button> is inline-block with
         browser-default padding/border (Tailwind's preflight doesn't zero those), rendering a
         hair taller than the h-4 wrapper. w-full + text-start also lets `truncate` have a width
         to ellipsis against, instead of shrink-wrapping the button to its text -->
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
