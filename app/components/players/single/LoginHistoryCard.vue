<!-- app\components\players\single\LoginHistoryCard.vue -->
<!-- Split out of players/[slug]/index.vue (2026-08-29, fallow:health) — one
     of three self-contained detail-page card sections that had made that
     page's template a complexity hotspot. -->
<script setup lang="ts">
defineProps<{ loading: boolean, dates: string[] | undefined }>()
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('player.detail.loginHistory') }}
    </template>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
    </div>

    <template v-else-if="!dates?.length">
      <div class="text-center py-8 text-muted">
        {{ $t('player.detail.loginHistoryEmpty') }}
      </div>
    </template>

    <template v-else>
      <div class="flex justify-center">
        <CalendarHeatmap :dates="dates" />
      </div>
    </template>
  </UCard>
</template>
