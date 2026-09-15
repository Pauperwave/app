<!-- app\components\tournaments\single\pairing\WinnerChecklistCard.vue -->
<!--
  "Vincitori tavoli" — ported from MagicTheGathering/league's
  WinnerChecklist.vue (user request, 2026-09-17, flagged as a completely
  missing feature: "quella è importantissima e deve essere copiata così
  com'è con tutte le funzionalità"). One row per table winner (pod draws
  are excluded upstream — a draw has no real winner, see
  CommanderRoundManager.vue's own winners computed) — a checkbox marks
  whether their booster/prize has actually been handed out. Self-hides
  when there are no winners yet this round, same as league's own
  `v-if="winners.length > 0"`.
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'

export interface WinnerChecklistEntry {
  pairingUuid: string
  tableNumber: number
  players: TablePlayer[]
}

const { winners, checked } = defineProps<{
  winners: WinnerChecklistEntry[]
  checked: Record<string, boolean>
}>()

const emit = defineEmits<{
  toggle: [playerUuid: string]
}>()

const { t } = useI18n()

const isOpen = ref(true)
</script>

<template>
  <div v-if="winners.length > 0" class="bg-elevated rounded-xl p-2.5 border border-default shadow-lg">
    <UCollapsible v-model:open="isOpen">
      <button type="button" class="flex items-center gap-1.5 mb-1.5 w-full cursor-pointer">
        <UIcon :name="ICONS.booster" class="size-4 text-warning" />
        <h4 class="text-sm font-bold">
          {{ t('tournament.single.winnerChecklist.title') }}
        </h4>
        <UIcon
          :name="ICONS.chevronDown"
          class="size-3.5 text-muted transition-transform"
          :class="isOpen ? '' : '-rotate-90'"
        />
      </button>

      <template #content>
        <p class="text-xs text-muted mb-1.5">
          {{ t('tournament.single.winnerChecklist.hint') }}
        </p>

        <div class="space-y-1">
          <template v-for="entry in winners" :key="entry.pairingUuid">
            <div
              v-for="player in entry.players"
              :key="player.value"
              class="flex items-center justify-between gap-2 p-1.5 rounded-lg cursor-pointer"
              :class="checked[player.value] ? 'bg-success/10' : 'bg-muted/30'"
              @click="emit('toggle', player.value)"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <div class="flex items-center gap-1 shrink-0">
                  <UIcon :name="ICONS.tableView" class="size-3.5 text-primary" />
                  <span class="text-sm font-semibold">{{ entry.tableNumber }}</span>
                </div>
                <span
                  class="text-sm truncate"
                  :class="checked[player.value] ? 'line-through opacity-60' : ''"
                >{{ player.label }}</span>
              </div>

              <UCheckbox
                :model-value="checked[player.value] ?? false"
                :aria-label="t('tournament.single.winnerChecklist.handedOutAriaLabel', {
                  name: player.label
                })"
                @click.stop
                @update:model-value="emit('toggle', player.value)"
              />
            </div>
          </template>
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
