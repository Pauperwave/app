<!-- app\components\tournaments\single\pairing\RoundNavButtons.vue -->
<!-- Turn-back / advance row shared by CommanderRoundManager.vue and SwissRoundManager.vue -->
<script setup lang="ts">
const {
  turnBackLabel, isLastRound, advanceDisabled = false, endLoading = false
} = defineProps<{
  turnBackLabel: string
  isLastRound: boolean
  advanceDisabled?: boolean
  endLoading?: boolean
}>()

const emit = defineEmits<{
  turnBack: []
  advance: []
  endTournament: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex items-center justify-between">
    <UButton
      :label="turnBackLabel"
      :icon="ICONS.undo"
      color="error"
      variant="outline"
      size="md"
      @click="emit('turnBack')"
    />

    <UButton
      v-if="!isLastRound"
      :label="t('tournament.single.roundManager.advanceButton')"
      :icon="ICONS.forward"
      :disabled="advanceDisabled"
      color="primary"
      variant="outline"
      size="md"
      trailing
      @click="emit('advance')"
    />
    <UButton
      v-else
      :label="t('tournament.single.roundManager.endTournamentButton')"
      :icon="ICONS.standings"
      :disabled="advanceDisabled"
      :loading="endLoading"
      color="primary"
      variant="outline"
      size="md"
      @click="emit('endTournament')"
    />
  </div>
</template>
