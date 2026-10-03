<!-- app\components\players\single\MentionsCard.vue -->
<!-- The special mentions of a player: how often they were the killer or the victim of a kill, and
     how often they were voted master brewer or player, the last two with the decks that earned
     them. -->
<script setup lang="ts">
import type { PlayerStats } from '~/composables/players/usePlayerStatsQuery'
import type { VoteMedals } from '#shared/utils/commanders/voteMedals'

const { stats, medals, loading } = defineProps<{
  stats: PlayerStats | undefined
  medals: VoteMedals | undefined
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
        :count="stats?.kills ?? 0"
        color="error"
      />
      <PlayersSingleMentionTile
        :icon="ICONS.deaths"
        :label="t('player.stats.victim')"
        :count="stats?.timesKilled ?? 0"
        color="neutral"
      />
      <PlayersSingleMentionTile
        :icon="ICONS.brewVote"
        :label="t('player.stats.masterBrewer')"
        :count="stats?.brewVotesReceived ?? 0"
        color="success"
      >
        <PlayersSingleDeckMedals :medals="medals?.brew ?? []" />
      </PlayersSingleMentionTile>
      <PlayersSingleMentionTile
        :icon="ICONS.vote"
        :label="t('player.stats.bestPlayer')"
        :count="stats?.playVotesReceived ?? 0"
        color="warning"
      >
        <PlayersSingleDeckMedals :medals="medals?.play ?? []" />
      </PlayersSingleMentionTile>
    </div>
  </section>
</template>
