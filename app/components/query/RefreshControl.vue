<!-- app\components\query\RefreshControl.vue -->
<script setup lang="ts">
import type { DataStateStatus } from '@pinia/colada'

// Pairs DataFreshnessIndicator with the manual refresh button every Pinia
// Colada-backed list page wires up next to it (associates roster/requests,
// see docs/architecture/query-keys.md) — one place to keep them in sync instead
// of re-composing useQueryFreshness + the two elements on every page.
interface Props {
  isLoading: boolean
  status: DataStateStatus
}

const { isLoading, status } = defineProps<Props>()
defineEmits<{ refresh: [] }>()

const { lastUpdatedAt } = useQueryFreshness(computed(() => isLoading), computed(() => status))
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-1.5">
    <UTooltip :text="t('common.refresh')">
      <UButton
        :icon="ICONS.refresh"
        color="neutral"
        variant="outline"
        :loading="isLoading"
        :aria-label="t('common.refresh')"
        @click="$emit('refresh')"
      />
    </UTooltip>

    <QueryDataFreshnessIndicator :last-updated-at="lastUpdatedAt" />
  </div>
</template>
