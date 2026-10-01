<!-- app\components\tournaments\single\TelegramNotificationsSwitch.vue -->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { tournament } = defineProps<{ tournament: Tournament }>()

const { t } = useI18n()
const toast = useToast()
const { setTelegramNotifications } = useTournamentsMutations()

async function onToggle(enabled: boolean) {
  try {
    await setTelegramNotifications.mutateAsync({ id: tournament.id, enabled })
  } catch {
    toast.add({ title: t('tournament.telegramNotifications.errorTitle'), color: 'error' })
  }
}
</script>

<template>
  <UTooltip :text="$t('tournament.telegramNotifications.description')">
    <USwitch
      :model-value="tournament.telegramNotificationsEnabled"
      :label="$t('tournament.telegramNotifications.label')"
      :loading="setTelegramNotifications.isLoading.value"
      @update:model-value="onToggle"
    />
  </UTooltip>
</template>
