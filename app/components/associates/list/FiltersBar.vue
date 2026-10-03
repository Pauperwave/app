<!-- app\components\associates\list\FiltersBar.vue -->
<!-- Extracted from associates/index.vue's #left toolbar slot, like
     wanted-cards/list/FiltersBar.vue: status filter and search, replaced by
     AssociatesListBulkActionsBar while there is a selection (that toggle stays in the page,
     only this "no selection" content moved out). Reused as-is by associates/requests.vue for
     the same search box. The consent-social dropdown was removed: filtering by it is still
     possible via the column's header filter. -->
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
  <SearchInput
    v-model="search"
    class="w-56 sm:w-64 lg:w-72"
    :placeholder="$t('associate.searchPlaceholder')"
  />

  <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />
</template>
