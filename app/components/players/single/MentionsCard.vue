<!-- app\components\players\single\MentionsCard.vue -->
<!-- The special mentions of a player: in how many tournaments they came first in each of the
     end-of-tournament awards (killer, victim, master brewer, player), the last two with the decks
     that earned them. -->
<script setup lang="ts">
import type { PlayerMentions } from '#shared/utils/players/playerMentions'

const { mentions, loading } = defineProps<{
  mentions: PlayerMentions | undefined
  loading: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-3">
    <h2 class="font-semibold flex items-center gap-2">
      <UIcon :name="ICONS.medal" class="size-5 shrink-0 text-warning" />
      {{ t('player.detail.sections.mentions') }}
    </h2>

    <div
      v-if="loading"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <USkeleton
        v-for="n in 4"
        :key="n"
        class="h-24"
      />
    </div>

    <div
      v-else
      class="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <PlayersSingleMentionTile
        :icon="ICONS.kills"
        :label="t('player.stats.killer')"
        :count="mentions?.killer ?? 0"
        color="error"
      />
      <PlayersSingleMentionTile
        :icon="ICONS.deaths"
        :label="t('player.stats.victim')"
        :count="mentions?.victim ?? 0"
        color="neutral"
      />
      <PlayersSingleMentionTile
        :icon="ICONS.brewVote"
        :label="t('player.stats.masterBrewer')"
        :count="mentions?.brewer ?? 0"
        color="success"
      >
        <PlayersSingleDeckMedals :medals="mentions?.brewerDecks ?? []" />
      </PlayersSingleMentionTile>
      <PlayersSingleMentionTile
        :icon="ICONS.vote"
        :label="t('player.stats.bestPlayer')"
        :count="mentions?.player ?? 0"
        color="warning"
      >
        <PlayersSingleDeckMedals :medals="mentions?.playerDecks ?? []" />
      </PlayersSingleMentionTile>
    </div>
  </section>
</template>
