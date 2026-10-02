<!-- app\components\ui\TelegramStatusIcon.vue -->
<!-- An associate's Telegram link state as one colored icon (same as the associates list). -->
<script setup lang="ts">
import { getTelegramLinkState, TELEGRAM_LINK_STATE_CONFIG } from '~/utils/associates/telegramLinkState'

const { associateUuid } = defineProps<{
  associateUuid: string | undefined
}>()

const { t } = useI18n()
const { data: associatesData } = useAssociatesQuery()
const { data: telegramUsernames } = useAssociateTelegramUsernamesQuery()

const state = computed(() => {
  const associate = (associatesData.value ?? []).find(a => a.uuid === associateUuid)
  return associate ? getTelegramLinkState(associate, telegramUsernames.value) : null
})

const COLOR_CLASS = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-dimmed',
  error: 'text-error'
} as const
</script>

<template>
  <UTooltip v-if="state" :text="t(`associate.telegramStatus.${state}`)">
    <UIcon
      :name="TELEGRAM_LINK_STATE_CONFIG[state].icon"
      :class="['size-4 shrink-0', COLOR_CLASS[TELEGRAM_LINK_STATE_CONFIG[state].color]]"
      :aria-label="t(`associate.telegramStatus.${state}`)"
    />
  </UTooltip>
</template>
