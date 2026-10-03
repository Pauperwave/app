<!-- app\components\tournaments\StatusBadge.vue -->
<!-- Thin tournament-domain wrapper around ui/StatusChangeBadge.vue: call sites stay simple
     (:tournament="tournament") while the dropdown/badge/error-toast logic lives once in the
     shared component. -->
<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'
import type { Tournament } from '~/types'

const { tournament, variant } = defineProps<{
  tournament: Tournament
  variant?: BadgeProps['variant']
}>()
const { t } = useI18n()
const { setStatus } = useTournamentsMutations()
</script>

<template>
  <StatusChangeBadge
    :id="tournament.id"
    :status="tournament.status"
    :statuses="TOURNAMENT_STATUSES"
    :icons="TOURNAMENT_STATUS_ICONS"
    :color="tournamentStatusColor"
    :label="(status) => t(`tournament.status.${status}`)"
    permission="manage-tournaments"
    :error-title="t('tournament.statusChangeErrorTitle')"
    :mutate-async="setStatus.mutateAsync"
    :variant="variant"
  />
</template>
