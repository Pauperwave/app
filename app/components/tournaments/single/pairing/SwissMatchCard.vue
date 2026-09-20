<!-- app\components\tournaments\single\pairing\SwissMatchCard.vue -->
<script setup lang="ts">
import type { MatchScore, SwissMatchPlayer } from '~/types'

const {
  tableNumber, players, current = null, isBye = false, search = ''
} = defineProps<{
  tableNumber: number
  players: SwissMatchPlayer[]
  current?: MatchScore | null
  // A single player sitting out: scores as a 2-0 win, nothing to enter.
  isBye?: boolean
  search?: string
}>()

const emit = defineEmits<{
  select: [score: MatchScore]
  toggleDrop: [playerUuid: string]
}>()

const { t } = useI18n()
</script>

<template>
  <UCard :ui="{ header: 'p-2 sm:px-3', body: 'p-2 sm:p-3 space-y-1.5' }">
    <template #header>
      <span class="font-medium">
        {{ isBye
          ? t('tournament.single.roundManager.byeTitle')
          : t('tournament.single.swissTablePreview.tableNumber', { n: tableNumber }) }}
      </span>
    </template>

    <div
      v-for="player in players"
      :key="player.playerUuid"
      class="flex items-center justify-between gap-2"
    >
      <div class="flex items-center gap-1.5">
        <AssociateTag
          :name="player.name"
          :surname="player.surname"
          :associate-uuid="player.associateUuid"
          :highlight-query="search"
          size="md"
        />
        <TournamentsSinglePairingSwissDropControl
          :dropped="player.dropped"
          @toggle="emit('toggleDrop', player.playerUuid)"
        />
      </div>

      <UBadge
        v-if="isBye"
        :label="t('tournament.single.roundManager.byeResult')"
        color="success"
        variant="subtle"
        size="lg"
      />
      <TournamentsSinglePairingSwissScoreButtons
        v-else
        :seat="player.seat"
        :current="current"
        @select="score => emit('select', score)"
      />
    </div>
  </UCard>
</template>
