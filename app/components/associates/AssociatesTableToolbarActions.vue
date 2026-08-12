<!-- app\components\associates\AssociatesTableToolbarActions.vue -->
<!--
  Shared by associates/index.vue and associates/requests.vue (fallow dupes,
  2026-08-12): the trailing toolbar chrome — refresh control + "show
  columns" dropdown — is identical on both tables. Page-specific leading
  actions (e.g. requests.vue's approve button) stay in each page's own
  #right slot, as siblings before this component.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DataStateStatus } from '@pinia/colada'

interface Props {
  isLoading: boolean
  status: DataStateStatus
  visibilityItems: DropdownMenuItem[]
}

const { isLoading, status, visibilityItems } = defineProps<Props>()
defineEmits<{ refresh: [] }>()
</script>

<template>
  <QueryRefreshControl :is-loading="isLoading" :status="status" @refresh="$emit('refresh')" />

  <UDropdownMenu :items="visibilityItems" :content="{ align: 'end' }">
    <UButton
      :label="$t('common.showColumns')"
      color="neutral"
      variant="outline"
      :trailing-icon="ICONS.settingsColumns"
    />
  </UDropdownMenu>
</template>
