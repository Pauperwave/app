<!-- app\components\players\single\DeckMedals.vue -->
<!-- The decks that earned a mention (master brewer, player) and how many times each, like medals:
     the commander (hover for the card) and a count badge. -->
<script setup lang="ts">
import type { VoteMedal } from '#shared/utils/commanders/voteMedals'

defineProps<{ medals: VoteMedal[] }>()
</script>

<template>
  <ul v-if="medals.length" class="flex flex-col gap-1.5">
    <li
      v-for="medal in medals"
      :key="medal.deckUuid"
      class="flex items-center justify-between gap-2 text-sm"
    >
      <span class="flex min-w-0 items-center gap-1.5">
        <UIcon :name="ICONS.medal" class="size-4 shrink-0 text-warning" />
        <TournamentsSinglePairingCommanderDeckHover
          :commander1-name="medal.commander1Name"
          :commander2-name="medal.commander2Name"
        />
      </span>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
      >
        ×{{ medal.votes }}
      </UBadge>
    </li>
  </ul>
</template>
