<!-- app\components\tournaments\single\pairing\TableStateBadge.vue -->
<script setup lang="ts">
const { isComplete } = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
</script>

<template>
  <UTooltip
    :content="{ side: 'top' }"
    :text="isComplete
      ? t('tournament.single.roundManager.tableComplete')
      : t('tournament.single.roundManager.tableIncomplete')"
  >
    <UBadge
      :color="isComplete ? 'success' : 'warning'"
      :leading-icon="isComplete ? ICONS.confirm : ICONS.clock"
      variant="subtle"
    >
      <span class="hidden @sm:inline whitespace-nowrap">
        {{ isComplete
          ? t('tournament.single.roundManager.tableComplete')
          : t('tournament.single.roundManager.tableIncomplete') }}
      </span>
    </UBadge>
  </UTooltip>
</template>
