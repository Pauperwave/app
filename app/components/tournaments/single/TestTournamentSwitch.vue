<!-- app\components\tournaments\single\TestTournamentSwitch.vue -->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { tournament } = defineProps<{ tournament: Tournament }>()

const { t } = useI18n()
const toast = useToast()
const { setTest } = useTournamentsMutations()

async function onToggle(isTest: boolean) {
  try {
    await setTest.mutateAsync({ id: tournament.id, isTest })
  } catch {
    toast.add({ title: t('tournament.test.errorTitle'), color: 'error' })
  }
}
</script>

<template>
  <UTooltip :text="$t('tournament.test.description')">
    <USwitch
      :model-value="tournament.isTest"
      :label="$t('tournament.test.label')"
      :loading="setTest.isLoading.value"
      @update:model-value="onToggle"
    />
  </UTooltip>
</template>
