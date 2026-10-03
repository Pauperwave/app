<!-- app\components\tournaments\single\pairing\RoundLifecycleConfirms.vue -->
<!-- Confirm dialogs for the two round-lifecycle actions that had none: "Torna indietro" deletes
     the round with its tables and results and tells the players on Telegram, "Termina torneo"
     closes every round. Shared by both round managers (Commander and 1v1). -->
<script setup lang="ts">
const turnBackOpen = defineModel<boolean>('turnBackOpen', { required: true })
const endOpen = defineModel<boolean>('endOpen', { required: true })

const { roundNumber, turnBackLoading = false, endLoading = false } = defineProps<{
  roundNumber: number
  turnBackLoading?: boolean
  endLoading?: boolean
}>()

const emit = defineEmits<{
  turnBack: []
  end: []
}>()

const { t } = useI18n()

const isFirstRound = computed(() => roundNumber <= 1)
</script>

<template>
  <ConfirmModal
    v-model:open="turnBackOpen"
    :title="isFirstRound
      ? t('tournament.single.roundManager.turnBackConfirm.titleFirst')
      : t('tournament.single.roundManager.turnBackConfirm.title', { round: roundNumber })"
    :description="isFirstRound
      ? t('tournament.single.roundManager.turnBackConfirm.descriptionFirst')
      : t('tournament.single.roundManager.turnBackConfirm.description', {
        round: roundNumber, previous: roundNumber - 1
      })"
    :warning="t('tournament.single.roundManager.turnBackConfirm.warning')"
    :confirm-label="isFirstRound
      ? t('tournament.single.roundManager.turnBackToRegistrationButton')
      : t('tournament.single.roundManager.turnBackButton')"
    :confirm-icon="ICONS.undo"
    :loading="turnBackLoading"
    @confirm="emit('turnBack')"
  />

  <ConfirmModal
    v-model:open="endOpen"
    :title="t('tournament.single.roundManager.endConfirm.title')"
    :description="t('tournament.single.roundManager.endConfirm.description')"
    :warning="t('tournament.single.roundManager.endConfirm.warning')"
    :confirm-label="t('tournament.single.roundManager.endTournamentButton')"
    :confirm-icon="ICONS.standings"
    confirm-color="primary"
    :loading="endLoading"
    @confirm="emit('end')"
  />
</template>
