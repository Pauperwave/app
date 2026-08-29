<!-- app\components\home\staff\ActiveLeaguesCard.vue -->
<!-- Split out of home/Staff.vue (2026-08-29, fallow:health) — see
     PendingActionsCard.vue's own comment. -->
<script setup lang="ts">
import type { League } from '~/types'

defineProps<{ leagues: League[] }>()
</script>

<template>
  <UPageCard
    id="tour-home-active-leagues"
    :title="$t('home.staff.activeLeagues.title')"
    variant="subtle"
  >
    <div v-if="!leagues.length" class="text-sm text-muted py-4 text-center">
      {{ $t('home.staff.activeLeagues.empty') }}
    </div>

    <div v-else class="flex flex-col divide-y divide-default">
      <NuxtLink
        v-for="league in leagues"
        :key="league.uuid"
        :to="`/leagues/${league.uuid}`"
        class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
          rounded-md hover:bg-elevated/50 hover:text-highlighted"
      >
        <span class="text-sm font-medium truncate">{{ league.name }}</span>
        <LeaguesStatusBadge :league="league" />
      </NuxtLink>
    </div>
  </UPageCard>
</template>
