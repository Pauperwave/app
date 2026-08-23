<!-- app\components\tournaments\StatusBadge.vue -->
<!--
  Extracted out of home/Staff.vue (2026-08-19) the moment "just a status
  badge" needed a permission-gated quick-change dropdown behind it — nothing
  about that is Home-specific, so it belongs at the tournament-domain level
  instead of trapped in one page's component. Read-only badge (no dropdown)
  below manage-tournaments; other call sites (the tournaments table, bulk
  actions bar) still render their own inline version for now — swapping
  those to this component is deferred, see docs/TODO.md.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament, TournamentStatus } from '~/types'

const { tournament } = defineProps<{ tournament: Tournament }>()
const { t } = useI18n()
const { can } = useUserRole()
const toast = useToast()

const { setStatus } = useTournamentsMutations()

async function changeStatus(status: TournamentStatus) {
  try {
    await setStatus.mutateAsync({ id: tournament.id, status })
  } catch (err) {
    toast.add({
      title: t('tournament.statusChangeErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

const items = computed<DropdownMenuItem[]>(() => TOURNAMENT_STATUSES.map(status => ({
  label: t(`tournament.status.${status}`),
  icon: TOURNAMENT_STATUS_ICONS[status],
  color: tournamentStatusColor(status),
  checked: status === tournament.status,
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
      :color="tournamentStatusColor(tournament.status)"
      :icon="TOURNAMENT_STATUS_ICONS[tournament.status]"
      variant="subtle"
      class="shrink-0 cursor-pointer"
    >
      {{ t(`tournament.status.${tournament.status}`) }}
    </UBadge>
  </UDropdownMenu>

  <UBadge
    v-else
    :color="tournamentStatusColor(tournament.status)"
    :icon="TOURNAMENT_STATUS_ICONS[tournament.status]"
    variant="subtle"
    class="shrink-0"
  >
    {{ t(`tournament.status.${tournament.status}`) }}
  </UBadge>
</template>
