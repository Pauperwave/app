<!-- app\components\tournaments\single\pairing\KillTrackerModal.vue -->
<!--
  Wraps KillFlowCanvas.vue in a modal — ported from
  MagicTheGathering/league's TournamentKillModal.vue/KillSystemModal.vue
  (user request, 2026-09-15/16: copy the kill-tracking flow as-is). Kills
  persist immediately on connect/remove (via useTournamentKillsMutations),
  not staged-then-confirmed — same "one real write per action" convention as
  AcceptancePicker.vue's payment buttons, rather than league's own local
  kills-store-then-submit staging (this app has no such store for this
  domain).
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'

const open = defineModel<boolean>('open', { default: false })

const { players, kills } = defineProps<{
  players: TablePlayer[]
  kills: { killerUuid: string, killedPlayerUuid: string }[]
}>()

const emit = defineEmits<{
  connect: [killerUuid: string, killedPlayerUuid: string]
  removeKill: [killerUuid: string, killedPlayerUuid: string]
}>()

const { t } = useI18n()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.killTracker.title')"
    :description="t('tournament.single.killTracker.description')"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <TournamentsSinglePairingKillFlowCanvas
        :players="players"
        :kills="kills"
        @connect="(killer, victim) => emit('connect', killer, victim)"
        @remove-kill="(killer, victim) => emit('removeKill', killer, victim)"
      />
    </template>

    <template #footer>
      <UButton
        :label="t('common.close')"
        color="neutral"
        variant="subtle"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
