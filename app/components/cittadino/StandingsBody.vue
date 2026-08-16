<!-- app\components\cittadino\StandingsBody.vue -->
<!--
  Shared mock-data-notice + error/loading/table body, used by
  PublicCittadinoPage.vue and standings/cittadino/index.vue (fallow:dupes
  flagged this block as an identical 35-line clone). Wrap with whatever
  layout element the parent needs (UDashboardPanel's #body slot vs. a plain
  div) — this component only owns the alert/spinner/table states.
-->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CittadinoStanding } from '~/types'

defineProps<{
  error: unknown
  isInitialLoad: boolean
  standings: CittadinoStanding[]
  columns: TableColumn<CittadinoStanding>[]
  loading: boolean
  tableMeta: Record<string, unknown>
  columnAccentColors: Record<string, string>
}>()
</script>

<template>
  <UAlert
    color="warning"
    variant="subtle"
    icon="i-lucide-triangle-alert"
    class="shrink-0"
    :description="$t('common.mockDataNotice')"
  />

  <UAlert
    v-if="error"
    color="error"
    variant="subtle"
    icon="i-lucide-circle-alert"
    :title="$t('cittadino.error.title')"
    :description="$t('cittadino.error.description')"
  >
    <template #actions>
      <UButton
        color="error"
        variant="outline"
        size="xs"
        @click="() => refreshNuxtData()"
      >
        {{ $t('common.retry') }}
      </UButton>
    </template>
  </UAlert>

  <div v-else-if="isInitialLoad" class="flex items-center justify-center py-12">
    <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
  </div>

  <template v-else>
    <PublicMatrixTable
      :data="standings"
      :columns="columns"
      :loading="loading"
      :meta="tableMeta"
      :column-accent-colors="columnAccentColors"
    />
  </template>
</template>
