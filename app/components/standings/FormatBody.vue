<!-- app\components\standings\FormatBody.vue -->
<!--
  Shared mock-data-notice + loading/table body, used by FormatPage.vue and
  PublicFormatPage.vue (fallow:dupes flagged this block as an identical
  clone). No error state here, unlike cittadino/StandingsBody.vue —
  useFormatStandingsQuery doesn't expose one.
-->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FormatStandingRow } from '~/types'

defineProps<{
  isInitialLoad: boolean
  standings: FormatStandingRow[]
  columns: TableColumn<FormatStandingRow>[]
  loading: boolean
  tableMeta: Record<string, unknown>
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

  <div v-if="isInitialLoad" class="flex items-center justify-center py-12">
    <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
  </div>

  <PublicMatrixTable
    v-else
    :data="standings"
    :columns="columns"
    :loading="loading"
    :meta="tableMeta"
  />
</template>
