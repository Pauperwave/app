<!-- app\components\leagues\StatusBadge.vue -->
<!--
  Same pattern as tournaments/StatusBadge.vue (2026-08-19) — a permission
  -gated quick-status-change dropdown behind an otherwise plain badge.
  manage-tournaments, not a dedicated manage-leagues permission: none exists
  (app/utils/permissions.ts), and the leagues nav item itself has no
  permission gate either — same "organizer manages competitions" capability
  either domain relies on server-side (requireManagementPermission).
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { League, LeagueStatus } from '~/types'

const { league } = defineProps<{ league: League }>()
const { t } = useI18n()
const { can } = useUserRole()
const toast = useToast()

const { setStatus } = useLeaguesMutations()

async function changeStatus(status: LeagueStatus) {
  try {
    await setStatus.mutateAsync({ id: league.id, status })
  } catch (err) {
    toast.add({
      title: t('league.statusChangeErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

const items = computed<DropdownMenuItem[]>(() => LEAGUE_STATUSES.map(status => ({
  label: t(`league.status.${status}`),
  icon: LEAGUE_STATUS_ICONS[status],
  color: leagueStatusColor(status),
  checked: status === league.status,
  type: 'checkbox' as const,
  onSelect: () => changeStatus(status)
})))
</script>

<template>
  <UDropdownMenu
    v-if="can('manage-tournaments')"
    :items="items"
    :content="{ align: 'end' }"
    @click.stop.prevent
  >
    <UBadge
      :color="leagueStatusColor(league.status)"
      :icon="LEAGUE_STATUS_ICONS[league.status]"
      variant="subtle"
      class="shrink-0 cursor-pointer"
    >
      {{ t(`league.status.${league.status}`) }}
    </UBadge>
  </UDropdownMenu>

  <UBadge
    v-else
    :color="leagueStatusColor(league.status)"
    :icon="LEAGUE_STATUS_ICONS[league.status]"
    variant="subtle"
    class="shrink-0"
  >
    {{ t(`league.status.${league.status}`) }}
  </UBadge>
</template>
