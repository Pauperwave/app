<!-- app\components\notifications\BellButton.vue -->
<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const { isNotificationsSlideoverOpen } = useDashboard()
const { t } = useI18n()
</script>

<template>
  <UTooltip :text="t('notificationsSlideover.title')" :shortcuts="['N']">
    <UButton
      color="neutral"
      variant="ghost"
      square
      @click="isNotificationsSlideoverOpen = true"
    >
      <UChip color="error" inset>
        <UIcon :name="ICONS.bell" class="size-5 shrink-0" />
      </UChip>
    </UButton>
  </UTooltip>
</template>
