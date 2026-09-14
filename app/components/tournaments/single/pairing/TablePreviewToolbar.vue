<!-- app\components\tournaments\single\pairing\TablePreviewToolbar.vue -->
<!--
  Total-score display + settings/optimize/random buttons above the pod
  grid — ported from MagicTheGathering/league's TablePreviewToolbar.vue
  (user request, 2026-09-15). useButtonLogging calls dropped — that
  analytics composable doesn't exist in this app.
-->
<script setup lang="ts">
const { totalScore, loading = false } = defineProps<{
  totalScore: number
  loading?: boolean
}>()

const emit = defineEmits<{
  openSettings: []
  optimize: []
  random: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="text-sm text-muted">
      {{ t('tournament.single.tablePreview.toolbar.totalScoreLabel') }}
      <span class="font-semibold text-default">{{ totalScore.toFixed(2) }}</span>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UTooltip
        :content="{ side: 'top' }"
        :text="t('tournament.single.tablePreview.toolbar.weightsAndConstraintsTooltip')"
      >
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          :icon="ICONS.settings"
          @click="emit('openSettings')"
        >
          {{ t('tournament.single.tablePreview.toolbar.weightsAndConstraints') }}
        </UButton>
      </UTooltip>
      <UTooltip
        :content="{ side: 'top' }"
        :text="t('tournament.single.tablePreview.toolbar.optimizeTooltip')"
      >
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :icon="ICONS.optimize"
          :disabled="loading"
          @click="emit('optimize')"
        >
          {{ t('tournament.single.tablePreview.toolbar.optimize') }}
        </UButton>
      </UTooltip>
      <UTooltip
        :content="{ side: 'top' }"
        :text="t('tournament.single.tablePreview.toolbar.randomTooltip')"
      >
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :icon="ICONS.shuffle"
          :disabled="loading"
          @click="emit('random')"
        >
          {{ t('tournament.single.tablePreview.toolbar.random') }}
        </UButton>
      </UTooltip>
    </div>
  </div>
</template>
