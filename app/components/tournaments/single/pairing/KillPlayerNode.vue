<!-- app\components\tournaments\single\pairing\KillPlayerNode.vue -->
<!--
  A single player chip on KillTrackerModal.vue's @vue-flow canvas — ported
  from MagicTheGathering/league's KillPlayerNode.vue (user request,
  2026-09-15/16: copy the kill-tracking canvas as-is, including the
  @vue-flow/core dependency). Dropped: the "suicide" badge/handle-loop
  support — this app's own tournament_kills table has a
  ck_tournament_kills_no_self_kill check constraint (killer_uuid <>
  killed_player_uuid), added earlier this session, so a self-kill can
  never be persisted here regardless of what the canvas would allow.
  Uses ICONS.kills/ICONS.deaths (not battle/playerLapsed) and
  generatePlayerAvatar (already a dependency elsewhere in this app, e.g.
  AssociateTag.vue) for the node's avatar, matching league 1:1 — an earlier
  pass here had used different icons/no avatar (2026-09-16 "mancano delle
  funzionalità" follow-up).
-->
<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import type { TablePlayer } from '~/types'
import type { PairingPlayerColor } from '~/utils/tournaments/pairingPlayerColor'

defineOptions({ inheritAttrs: false })

interface PlayerNodeData {
  player: TablePlayer
  width: string
  color: PairingPlayerColor
  killCount: number
  deathCount: number
}

const { id, data, selected } = defineProps<{
  // Required by Vue Flow's node component contract, always passed even
  // though this component keys off data.player.value instead.
  id: string
  data: PlayerNodeData
  selected: boolean
}>()

const { t } = useI18n()

const hasStats = computed(() => data.killCount > 0 || data.deathCount > 0)
</script>

<template>
  <NodeToolbar
    :node-id="id"
    :is-visible="hasStats"
    :position="Position.Top"
    :offset="8"
  >
    <div class="flex items-center gap-1 rounded-lg border border-default bg-elevated px-2 py-1 shadow-sm">
      <UTooltip
        v-if="data.killCount > 0"
        :content="{ side: 'top' }"
        :text="t('tournament.single.killTracker.killCountTooltip', { count: data.killCount })"
      >
        <UBadge
          :icon="ICONS.kills"
          :label="String(data.killCount)"
          :color="data.color"
          variant="solid"
        />
      </UTooltip>
      <UTooltip
        v-if="data.deathCount > 0"
        :content="{ side: 'top' }"
        :text="t('tournament.single.killTracker.deathCountTooltip', { count: data.deathCount })"
      >
        <UBadge
          :icon="ICONS.deaths"
          :label="String(data.deathCount)"
          color="neutral"
          variant="solid"
        />
      </UTooltip>
    </div>
  </NodeToolbar>

  <Handle
    id="source"
    type="source"
    :position="Position.Bottom"
    class="w-3! h-3! bg-error-500! border-2! border-white!"
  />

  <div
    class="rounded-lg border-2 bg-default shadow-sm transition-all duration-150"
    :class="selected ? 'border-primary-500 shadow-primary-500/20 shadow-lg' : 'border-default hover:border-muted'"
    :style="{ width: data.width }"
  >
    <div class="flex items-center gap-2 px-2 py-2">
      <UAvatar :src="generatePlayerAvatar(data.player.value)" :alt="data.player.label" />
      <p class="text-xs font-semibold whitespace-nowrap">
        {{ data.player.label }}
      </p>
    </div>
  </div>

  <Handle
    id="target"
    type="target"
    :position="Position.Top"
    class="w-3! h-3! bg-neutral-400! border-2! border-white!"
  />
</template>
