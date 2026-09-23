<!-- app\components\tournaments\single\pairing\SwissMatchPlayerRow.vue -->
<!-- One player's row within a SwissMatchCard.vue table: name + drop badge,
     score entry (or the bye result badge), drop action. Extracted out of
     SwissMatchCard.vue (2026-09-24) alongside SwissMatchResultBadge.vue —
     the two together are what SwissMatchCard.vue's own v-for loop rendered
     inline before. -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { MatchScore, SwissMatchPlayer } from '~/types'

const {
  player,
  current = null,
  reported = null,
  isBye = false,
  search = ''
} = defineProps<{
  player: SwissMatchPlayer
  current?: MatchScore | null
  // See SwissScoreButtons.vue's own `reported` prop.
  reported?: MatchScore | null
  isBye?: boolean
  search?: string
}>()

const emit = defineEmits<{
  select: [score: MatchScore]
  toggleDrop: [playerUuid: string]
}>()

const { t } = useI18n()

// Drop is an action, not a state: the state shows next to the name as a badge.
const dropMenuItems = computed<DropdownMenuItem[]>(() => [{
  label: player.dropped
    ? t('tournament.single.roundManager.dropUndoLabel')
    : t('tournament.single.roundManager.dropLabel'),
  icon: ICONS.drop,
  onSelect: () => emit('toggleDrop', player.playerUuid)
}])
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-1.5">
      <AssociateTag
        :name="player.name"
        :surname="player.surname"
        :associate-uuid="player.associateUuid"
        :highlight-query="search"
        size="md"
        :class="player.dropped && 'opacity-60 line-through'"
      />
      <UTooltip
        v-if="player.dropped"
        :text="t('tournament.single.roundManager.dropBadgeTooltip', {
          round: player.dropped.roundNumber,
          time: formatDropTime(player.dropped.droppedAt)
        })"
      >
        <UBadge
          :label="t('tournament.single.roundManager.dropBadge', {
            round: player.dropped.roundNumber
          })"
          color="warning"
          variant="subtle"
          size="sm"
        />
      </UTooltip>
    </div>

    <div class="flex items-center gap-1">
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
        :reported="reported"
        @select="score => emit('select', score)"
      />
      <RowActionsMenu :items="dropMenuItems" />
    </div>
  </div>
</template>
