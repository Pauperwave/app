<!-- app\components\tournaments\single\pairing\KillTrackerModal.vue -->
<!--
  Wraps KillFlowCanvas.vue in a modal — ported from
  MagicTheGathering/league's TournamentKillModal.vue/KillSystemModal.vue
  (user request, 2026-09-15/16: copy the kill-tracking flow as-is; 2026-09-16:
  "mancano delle funzionalità" added the registered-kills badge list, its
  per-kill remove + reset-all, and the ClientOnly/loading guard around the
  canvas that this pass had originally dropped). Kills persist immediately
  on connect/remove (via useTournamentKillsMutations), not staged-then-
  confirmed — same "one real write per action" convention as
  AcceptancePicker.vue's payment buttons, rather than league's own local
  kills-store-then-submit staging (this app has no such store for this
  domain) — so "Azzera" here calls removeKill for every existing kill
  instead of just clearing an in-memory draft.
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

const playerColors = computed(() => getPairingPlayerColorMap(players))

function labelFor(playerUuid: string): string {
  return players.find(p => p.value === playerUuid)?.label
    ?? t('tournament.single.killTracker.playerFallback', { uuid: playerUuid })
}

function resetAll() {
  for (const kill of kills) {
    emit('removeKill', kill.killerUuid, kill.killedPlayerUuid)
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.killTracker.title')"
    :description="t('tournament.single.killTracker.description')"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Client-only: @vue-flow/core doesn't render on the server. -->
        <ClientOnly>
          <TournamentsSinglePairingKillFlowCanvas
            :players="players"
            :kills="kills"
            @connect="(killer, victim) => emit('connect', killer, victim)"
            @remove-kill="(killer, victim) => emit('removeKill', killer, victim)"
          />
          <template #fallback>
            <div class="h-[420px] flex items-center justify-center text-muted">
              <UIcon :name="ICONS.loading" class="animate-spin size-6" />
            </div>
          </template>
        </ClientOnly>

        <!-- Text list of registered kills -->
        <div v-if="kills.length > 0" class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-muted">
              {{ t('tournament.single.killTracker.registeredKillsLabel') }}
            </p>
            <UButton
              :label="t('tournament.single.killTracker.resetButton')"
              :icon="ICONS.delete"
              color="error"
              variant="outline"
              size="xs"
              @click="resetAll"
            />
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="kill in kills"
              :key="`${kill.killerUuid}-${kill.killedPlayerUuid}`"
              :color="playerColors.get(kill.killerUuid)"
              variant="soft"
              class="gap-1.5"
            >
              <UIcon
                :name="ICONS.close"
                class="size-4 cursor-pointer hover:opacity-70"
                :aria-label="t('tournament.single.killTracker.removeKillAriaLabel')"
                @click="emit('removeKill', kill.killerUuid, kill.killedPlayerUuid)"
              />
              {{ labelFor(kill.killerUuid) }}
              <UIcon :name="ICONS.forward" class="size-3" />
              {{ labelFor(kill.killedPlayerUuid) }}
            </UBadge>
          </div>
        </div>

        <p v-else class="text-sm text-muted text-center py-2">
          {{ t('tournament.single.killTracker.noKills') }}
        </p>
      </div>
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
