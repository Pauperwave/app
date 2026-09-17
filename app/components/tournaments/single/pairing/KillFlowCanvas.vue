<!-- app\components\tournaments\single\pairing\KillFlowCanvas.vue -->
<!--
  Node-graph kill tracker for one pod's round — ported from
  MagicTheGathering/league's KillFlowCanvas.vue (user request, 2026-09-15/16:
  copy the kill-tracking canvas as-is, including the @vue-flow/core
  dependency). Props/emits-driven instead of a Pinia store (this app has no
  such store for this domain): `kills` comes straight from
  useTournamentKillsQuery.ts, and `connect`/`removeKill` just tell the parent
  modal to call the real mutations — the canvas holds no state of its own.

  Dropped vs. league's version: the "loopback" self-kill edge type and its
  suicide badge — this app's tournament_kills table has a
  ck_tournament_kills_no_self_kill check constraint (killer_uuid <>
  killed_player_uuid, added earlier this session), so a self-kill edge could
  never be persisted here anyway. 2026-09-16 "il codice del grafo non si
  comporta allo stesso modo" follow-up: onConnect/onEdgeClick now validate
  duplicate/reverse kills and toast feedback exactly like league's
  killsStore.addKill/onEdgeClick, instead of silently emitting straight to
  the mutation with no client-side check or confirmation.
-->
<script setup lang="ts">
import { VueFlow, MarkerType, useVueFlow, type Node, type Edge, type Connection, type EdgeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls, ControlButton } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import KillPlayerNode from './KillPlayerNode.vue'
import type { TablePlayer } from '~/types'
import { getPairingPlayerColorMap } from '~/utils/tournaments/pairingPlayerColor'

const FLOW_ID = 'kill-flow'
const {
  setEdges, onInit, zoomIn, zoomOut, fitView
} = useVueFlow(FLOW_ID)

const { players, kills } = defineProps<{
  players: TablePlayer[]
  kills: { killerUuid: string, killedPlayerUuid: string }[]
}>()

const emit = defineEmits<{
  connect: [killerUuid: string, killedPlayerUuid: string]
  removeKill: [killerUuid: string, killedPlayerUuid: string]
}>()

const { t } = useI18n()
const toast = useToast()

const interactive = ref(true)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes = { player: markRaw(KillPlayerNode) } as any

const playerColors = computed(() => getPairingPlayerColorMap(players))

const nodeWidth = computed(() => {
  const maxChars = Math.max(1, ...players.map(p => p.label.length))
  return `calc(${maxChars}ch + 4rem)`
})

// Distributes `total` nodes around a rectangle's perimeter, one side at a
// time: each side gets a share of nodes proportional to its own length
// (largest-remainder rounding so the shares sum to `total` exactly), then
// spaced evenly along that side.
function getRectangularPosition(index: number, total: number, width = 320, height = 240) {
  const sideLengths = [width, height, width, height]
  const perimeter = sideLengths.reduce((sum, length) => sum + length, 0)

  const rawShares = sideLengths.map(length => (total * length) / perimeter)
  const counts = rawShares.map(Math.floor)
  const assigned = counts.reduce((sum, count) => sum + count, 0)
  const remainders = rawShares
    .map((share, i) => ({ i, frac: share - Math.floor(share) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < total - assigned; k++) {
    counts[remainders[k]!.i]!++
  }

  let side = 0
  let posInSide = index
  while (side < 3 && posInSide >= counts[side]!) {
    posInSide -= counts[side]!
    side++
  }
  const t = posInSide / (counts[side] || 1)

  switch (side) {
    case 0: return { x: t * width, y: 0 }
    case 1: return { x: width, y: t * height }
    case 2: return { x: width - t * width, y: height }
    default: return { x: 0, y: height - t * height }
  }
}

function killCount(playerUuid: string) {
  return kills.filter(k => k.killerUuid === playerUuid).length
}
function deathCount(playerUuid: string) {
  return kills.filter(k => k.killedPlayerUuid === playerUuid).length
}

const nodes = computed<Node[]>(() =>
  players.map((player, index) => ({
    id: player.value,
    type: 'player',
    position: getRectangularPosition(index, players.length),
    data: {
      player,
      width: nodeWidth.value,
      color: playerColors.value.get(player.value)!,
      killCount: killCount(player.value),
      deathCount: deathCount(player.value)
    },
    draggable: false
  })))

function mapKillsToEdges(): Edge[] {
  const validPlayerUuids = new Set(players.map(p => p.value))
  return kills
    .filter(k => validPlayerUuids.has(k.killerUuid) && validPlayerUuids.has(k.killedPlayerUuid))
    .map((kill) => {
      const color = `var(--ui-color-${playerColors.value.get(kill.killerUuid)}-500)`
      return {
        id: `${kill.killerUuid}-${kill.killedPlayerUuid}`,
        source: kill.killerUuid,
        target: kill.killedPlayerUuid,
        sourceHandle: 'source',
        targetHandle: 'target',
        deletable: true,
        style: { stroke: color, strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.Arrow, color, width: 15, height: 15 }
      }
    })
}

onInit(() => setEdges(mapKillsToEdges()))
watch(() => kills, () => setEdges(mapKillsToEdges()), { deep: true })

const defaultEdgeOptions = {
  style: { stroke: 'var(--ui-color-primary-500)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.Arrow, color: 'var(--ui-color-primary-500)', width: 15, height: 15 }
}

// No self-kills (see the file comment) — the only structural rule left to
// check here is that both endpoints belong to this pod.
function validateConnection(connection: Connection): boolean {
  const validPlayerUuids = new Set(players.map(p => p.value))
  return connection.source !== connection.target
    && validPlayerUuids.has(connection.source)
    && validPlayerUuids.has(connection.target)
}

// Same duplicate/reverse-kill rejection as league's killsStore.addKill —
// Vue Flow re-runs `isValidConnection` against every edge on every setEdges()
// sync (not just live drag attempts), so that check only covers table
// membership; a real kill (already present, or its exact reverse) is
// rejected here instead, once, at the moment the user actually drags a
// connection.
function isKillPresent(killerUuid: string, killedPlayerUuid: string): boolean {
  return kills.some(k => k.killerUuid === killerUuid && k.killedPlayerUuid === killedPlayerUuid)
}
function isReverseKillPresent(killerUuid: string, killedPlayerUuid: string): boolean {
  return kills.some(k => k.killerUuid === killedPlayerUuid && k.killedPlayerUuid === killerUuid)
}

function onConnect(connection: Connection) {
  const { source: killerUuid, target: killedPlayerUuid } = connection

  if (isKillPresent(killerUuid, killedPlayerUuid)) {
    toast.add({
      title: t('tournament.single.killTracker.invalidTitle'),
      description: t('tournament.single.killTracker.alreadyRegistered'),
      color: 'warning',
      icon: ICONS.warning
    })
    return
  }
  if (isReverseKillPresent(killerUuid, killedPlayerUuid)) {
    toast.add({
      title: t('tournament.single.killTracker.invalidTitle'),
      description: t('tournament.single.killTracker.victimAlreadyKilled'),
      color: 'warning',
      icon: ICONS.warning
    })
    return
  }

  emit('connect', killerUuid, killedPlayerUuid)
}

function onEdgeClick({ edge }: EdgeMouseEvent) {
  emit('removeKill', edge.source, edge.target)
  toast.add({
    title: t('tournament.single.killTracker.killRemovedTitle'),
    color: 'neutral',
    icon: ICONS.delete,
    duration: 2000
  })
}
</script>

<template>
  <div class="w-full rounded-lg overflow-hidden border border-default" style="height: 420px">
    <VueFlow
      :id="FLOW_ID"
      :nodes="nodes"
      :node-types="nodeTypes"
      :connect-on-click="false"
      :nodes-draggable="false"
      :nodes-connectable="interactive"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :pan-on-drag="true"
      :pan-on-scroll="false"
      fit-view-on-init
      :connection-radius="30"
      :default-edge-options="defaultEdgeOptions"
      :is-valid-connection="validateConnection"
      @connect="onConnect"
      @edge-click="onEdgeClick"
    >
      <Background pattern-color="var(--ui-border)" :gap="20" />

      <Controls
        position="top-left"
        :show-zoom="false"
        :show-fit-view="false"
        :show-interactive="false"
      >
        <ControlButton :title="t('tournament.single.killTracker.zoomIn')" @click="zoomIn()">
          <UIcon :name="ICONS.add" class="size-5" />
        </ControlButton>
        <ControlButton :title="t('tournament.single.killTracker.zoomOut')" @click="zoomOut()">
          <UIcon :name="ICONS.subtract" class="size-5" />
        </ControlButton>
        <ControlButton :title="t('tournament.single.killTracker.fitView')" @click="fitView()">
          <UIcon :name="ICONS.fitView" class="size-5" />
        </ControlButton>
        <ControlButton
          :title="interactive
            ? t('tournament.single.killTracker.lock')
            : t('tournament.single.killTracker.unlock')"
          @click="interactive = !interactive"
        >
          <UIcon :name="interactive ? ICONS.unlock : ICONS.lock" class="size-5" />
        </ControlButton>
      </Controls>
    </VueFlow>
  </div>
</template>

<style scoped>
:deep(.vue-flow__controls) {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

:deep(.vue-flow__controls-button) {
  width: 1.25rem;
  height: 1.25rem;
  background: var(--ui-bg-elevated);
  border: none;
  border-bottom: 1px solid var(--ui-border);
  color: var(--ui-text);
}

:deep(.vue-flow__controls-button:last-child) {
  border-bottom: none;
}

:deep(.vue-flow__controls-button:hover) {
  background: var(--ui-bg-accented);
}
</style>
