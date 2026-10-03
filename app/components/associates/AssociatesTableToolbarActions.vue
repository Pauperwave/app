<!-- app\components\associates\AssociatesTableToolbarActions.vue -->
<!-- Shared by associates/index.vue and associates/requests.vue: the "show columns" dropdown is
     identical on both tables. The refresh control lives in each page's UDashboardNavbar
     #trailing slot (next to the title, like
     transactions/wanted-cards/tournaments/events/leagues), so this is just the dropdown.
     Page-specific leading actions (e.g. requests.vue's approve button) stay in each page's own
     #right slot, as siblings before this component. -->
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
