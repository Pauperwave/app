<!-- app\components\tournaments\single\pairing\RoundNavButtons.vue -->
<!-- Turn-back / advance row shared by CommanderRoundManager.vue and SwissRoundManager.vue.
     Once the tournament has ended (`ended`) there is nothing to advance or turn back: only the way
     back from "Termina torneo", which reopens it. -->
<script setup lang="ts">
const {
  turnBackLabel,
  isLastRound,
  advanceDisabled = false,
  advanceDisabledTooltip,
  endLoading = false,
  ended = false,
  reopenLoading = false
} = defineProps<{
  turnBackLabel: string
  isLastRound: boolean
  advanceDisabled?: boolean
  // Overrides the default "enter every result first" explanation.
  advanceDisabledTooltip?: string
  endLoading?: boolean
  ended?: boolean
  reopenLoading?: boolean
}>()

const emit = defineEmits<{
  turnBack: []
  advance: []
  endTournament: []
  reopen: []
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="ended" class="flex justify-end">
    <UButton
      :label="t('tournament.single.roundManager.reopenTournamentButton')"
      :icon="ICONS.unlock"
      :loading="reopenLoading"
      color="neutral"
      variant="outline"
      size="md"
      @click="emit('reopen')"
    />
  </div>

  <div v-else class="flex items-center justify-between">
    <UButton
      :label="turnBackLabel"
      :icon="ICONS.undo"
      color="error"
      variant="outline"
      size="md"
      @click="emit('turnBack')"
    />

    <!-- The wrapper span keeps hover alive while the button is disabled -->
    <UTooltip
      :text="advanceDisabledTooltip ?? t('tournament.single.roundManager.advanceDisabledTooltip')"
      :disabled="!advanceDisabled"
    >
      <span class="inline-flex">
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
      </span>
    </UTooltip>
  </div>
</template>
