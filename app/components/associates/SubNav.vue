<!-- app\components\associates\SubNav.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Shared switcher between /associates (roster, approved members only) and
// /associates/requests (pending/rejected requests) — two sibling routes, not
// a shared parent layout (see docs/PROGRESS.md ADR for the split): the two
// views diverge enough in data/actions that nesting them under one layout
// would fight more than it'd save. This component is the only thing they
// share, rendered identically on both pages.
const { pendingCount } = defineProps<{ pendingCount: number }>()
const { t } = useI18n()

const links = computed<NavigationMenuItem[][]>(() => [[{
  label: t('associate.subNav.roster'),
  icon: ICONS.players,
  to: '/associates',
  exact: true
}, {
  label: t('associate.subNav.requests'),
  icon: ICONS.inbox,
  to: '/associates/requests',
  badge: pendingCount || undefined
}]])
</script>

<template>
  <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
</template>
