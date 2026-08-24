<!-- app\components\associates\list\FiltersBar.vue -->
<!--
  Extracted out of associates/index.vue's #left toolbar slot (2026-08-16),
  same reasoning as wanted-cards/list/FiltersBar.vue — status filter and
  search, replaced by AssociatesListBulkActionsBar while there's a
  selection (that toggle stays in the page, only this "no selection"
  content moved out). Reused as-is by associates/requests.vue (2026-08-19)
  for the same search box. The consent-social dropdown that used to live
  here was removed the same day (user request) — filtering by that is
  still possible via the column's own header filter.
-->
<script setup lang="ts">
interface StatusTab {
  label: string
  value: string
  count?: number
  icon?: string
}

const { statusTabs } = defineProps<{
  statusTabs: StatusTab[]
}>()

const activeStatusTab = defineModel<string>('activeStatusTab', { required: true })
const search = defineModel<string>('search', { required: true })
</script>

<template>
  <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />

  <SearchInput
    v-model="search"
    class="w-56 sm:w-64 lg:w-72"
    :placeholder="$t('associate.searchPlaceholder')"
  />
</template>
