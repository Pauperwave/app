<!-- app\components\leagues\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { League } from '~/types'

const { leagues, contextMenuItems } = defineProps<{
  leagues: League[]
  contextMenuItems: (league: League) => DropdownMenuItem[]
}>()

const { t } = useI18n()

function progress(league: League) {
  if (!league.tournamentCount) return 0
  return Math.round((league.completedTournamentCount / league.tournamentCount) * 100)
}
</script>

<template>
  <div v-if="!leagues.length" class="text-center py-12 text-muted">
    {{ $t('league.grid.empty') }}
  </div>

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <UContextMenu
      v-for="league in leagues"
      :key="league.id"
      :items="contextMenuItems(league)"
    >
      <UCard
        class="cursor-pointer hover:ring-primary transition-colors"
        @click="navigateTo(`/leagues/${league.uuid}`)"
      >
        <div class="flex items-start justify-between gap-2 mb-4">
          <h3 class="font-semibold truncate">
            {{ league.name }}
          </h3>
          <UBadge
            :color="leagueStatusColor(league.status)"
            variant="subtle"
            :icon="LEAGUE_STATUS_ICONS[league.status]"
            class="shrink-0"
          >
            {{ t(`league.status.${league.status}`) }}
          </UBadge>
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-sm text-muted">
            <span>{{ t('league.tournamentsLabel') }}</span>
            <span>{{ t('league.progress', {
              completed: league.completedTournamentCount, total: league.tournamentCount
            }) }}</span>
          </div>
          <UProgress :model-value="progress(league)" size="sm" />
        </div>
      </UCard>
    </UContextMenu>
  </div>
</template>
