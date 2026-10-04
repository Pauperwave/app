<!-- app\components\tournaments\single\pairing\ReportTableHover.vue -->
<!-- Header of a round in the player report: the round in bold, the table in grey. Hovering the
     table lists the other players at it, and picking one opens their own report. -->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/utils/tournaments/liveCommanderStandings'

defineProps<{
  roundNumber: number
  tableNumber: number | null
  opponents: LiveCommanderStanding[]
}>()

const emit = defineEmits<{
  select: [playerUuid: string]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex items-baseline gap-2">
    <span class="text-base font-bold">
      {{ t('tournament.single.roundManager.reportRoundLabel', { round: roundNumber }) }}
    </span>
    <span class="text-muted">·</span>

    <UPopover mode="hover" :open-delay="150">
      <span class="text-sm text-muted cursor-default underline decoration-dotted">
        {{ t('tournament.single.roundManager.reportTableLabel', { table: tableNumber ?? '–' }) }}
      </span>

      <template #content>
        <div class="p-2 min-w-48 space-y-1">
          <p class="px-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {{ t('tournament.single.roundManager.reportTablePlayers') }}
          </p>
          <button
            v-for="opponent in opponents"
            :key="opponent.playerUuid"
            type="button"
            :aria-label="
              t('tournament.single.roundManager.reportOpenPlayer', { name: opponent.label })
            "
            class="flex w-full items-center rounded px-2 py-1 text-left cursor-pointer hover:bg-elevated"
            @click="emit('select', opponent.playerUuid)"
          >
            <AssociateTag
              :name="opponent.firstName"
              :surname="opponent.surname"
              size="xs"
            />
          </button>
        </div>
      </template>
    </UPopover>
  </div>
</template>
