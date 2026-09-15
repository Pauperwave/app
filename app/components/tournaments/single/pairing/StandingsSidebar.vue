<!-- app\components\tournaments\single\pairing\StandingsSidebar.vue -->
<!--
  Live standings sidebar for a Commander round in progress — ported from
  MagicTheGathering/league's StandingsCard.vue (user request, 2026-09-15/16:
  copy the live-standings display as-is), sourced from
  useLiveCommanderStandings.ts (see that composable's own comment on why
  it's "live relative to a save", not "live relative to an unsaved edit"
  like league's own store-backed version).
-->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/useLiveCommanderStandings'

defineProps<{
  standings: LiveCommanderStanding[]
  isEnded: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon :name="ICONS.standings" class="size-5 text-primary" />
        <h3 class="font-semibold">
          {{ isEnded
            ? t('tournament.single.roundManager.standingsFinal')
            : t('tournament.single.roundManager.standingsPartial') }}
        </h3>
      </div>
    </template>

    <div class="space-y-1.5">
      <div
        v-for="(standing, index) in standings"
        :key="standing.playerUuid"
        class="flex items-center gap-2 rounded-md px-2 py-1.5"
        :class="index === 0 ? 'bg-warning/10' : ''"
      >
        <span class="w-6 shrink-0 text-right font-mono text-sm text-muted">{{ index + 1 }}</span>
        <AssociateTag
          :name="standing.label"
          :associate-uuid="standing.associateUuid"
          size="sm"
          class="flex-1 truncate"
        />
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ t('tournament.single.roundManager.standingsPoints', { points: standing.score }) }}
        </UBadge>
      </div>
    </div>

    <EmptyState
      v-if="!standings.length"
      :message="t('tournament.single.roundManager.standingsEmpty')"
    />
  </UCard>
</template>
