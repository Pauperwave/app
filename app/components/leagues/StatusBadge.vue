<!-- app\components\leagues\StatusBadge.vue -->
<!-- Thin league-domain wrapper around ui/StatusChangeBadge.vue: call sites stay simple
     (:league="league") while the dropdown/badge/error-toast logic lives once in the shared
     component. manage-tournaments, not a dedicated manage-leagues permission: none exists
     (app/utils/permissions.ts) and the leagues nav item has no permission gate either: the same
     "organizer manages competitions" capability both domains rely on server-side
     (requireManagementPermission). -->
<script setup lang="ts">
import type { League } from '~/types'

const { league } = defineProps<{ league: League }>()
const { t } = useI18n()
const { setStatus } = useLeaguesMutations()
</script>

<template>
  <StatusChangeBadge
    :id="league.id"
    :status="league.status"
    :statuses="LEAGUE_STATUSES"
    :icons="LEAGUE_STATUS_ICONS"
    :color="leagueStatusColor"
    :label="(status) => t(`league.status.${status}`)"
    permission="manage-tournaments"
    :error-title="t('league.statusChangeErrorTitle')"
    :mutate-async="setStatus.mutateAsync"
  />
</template>
