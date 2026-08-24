<!-- app\components\associates\AssociatesTableToolbarActions.vue -->
<!--
  Shared by associates/index.vue and associates/requests.vue (fallow dupes,
  2026-08-12): the "show columns" dropdown is identical on both tables. The
  refresh control moved to each page's UDashboardNavbar #trailing slot
  (2026-08-14, next to the title — same placement as transactions/wanted-
  cards/tournaments/events/leagues), so this component is just the dropdown
  now. Page-specific leading actions (e.g. requests.vue's approve button)
  stay in each page's own #right slot, as siblings before this component.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

interface Props {
  visibilityItems: DropdownMenuItem[]
}

const { visibilityItems } = defineProps<Props>()
</script>

<template>
  <ColumnVisibilityMenu :items="visibilityItems" />
</template>
