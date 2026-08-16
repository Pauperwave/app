<!-- app\components\associates\list\FiltersBar.vue -->
<!--
  Extracted out of associates/index.vue's #left toolbar slot (2026-08-16),
  same reasoning as wanted-cards/list/FiltersBar.vue — status filter, email
  search, and the consent-social filter, all replaced by
  AssociatesListBulkActionsBar while there's a selection (that toggle stays
  in the page, only this "no selection" content moved out).
-->
<script setup lang="ts">
interface StatusTab {
  label: string
  value: string
  count?: number
}

interface ConsentSocialOption {
  label: string
  value: string
  icon: string
  color: string
}

const { statusTabs, consentSocialOptions } = defineProps<{
  statusTabs: StatusTab[]
  consentSocialOptions: ConsentSocialOption[]
}>()

const activeStatusTab = defineModel<string>('activeStatusTab', { required: true })
const emailFilter = defineModel<string>('emailFilter', { required: true })
const consentSocialFilter = defineModel<string>('consentSocialFilter', { required: true })
</script>

<template>
  <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />

  <UInput
    v-model="emailFilter"
    class="max-w-sm"
    :icon="ICONS.search"
    :placeholder="$t('common.filterEmailsPlaceholder')"
  />

  <UTooltip :text="$t('associate.consentSocialLabel')">
    <UStatusSelect
      v-model="consentSocialFilter"
      :items="consentSocialOptions"
      name="consentSocialFilter"
    />
  </UTooltip>
</template>
