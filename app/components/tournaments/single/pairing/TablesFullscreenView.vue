<!-- app\components\tournaments\single\pairing\TablesFullscreenView.vue -->
<!-- A big-display readout of the current round's tables (table number + surnames only), meant
     to be read across a room (projector/TV), not interacted with. Separate from
     RoundPairingCard.vue, which owns the editable table cards and their modals/actions: this
     one is pure display. Ported from league's PairingsFullscreenView.vue, adapted to uuid-keyed
     pairings/players. -->
<script setup lang="ts">
import type { TournamentPairing } from '~/composables/tournaments/pairing/useTournamentPairingsQuery'
import type { TablePlayer } from '~/types'

// playersByPairingUuid: already-resolved players (tablePlayersFor's output), not a lookup function:
// this component is pure display and shouldn't own how a name is resolved (every other consumer
// here receives plain data)
const { pairingsForRound, playersByPairingUuid } = defineProps<{
  pairingsForRound: TournamentPairing[]
  playersByPairingUuid: Map<string, TablePlayer[]>
}>()

const emit = defineEmits<{ exit: [] }>()

const { t } = useI18n()

/**
 * Resolves a pairing's seats to display parts in one pass — surname and
 * initial ("N.") kept separate so the template can render the initial
 * muted, surname full-weight. Surname alone can collide (families/clubs
 * sharing one), hence the initial at all.
 */
function tablePlayers(
  pairing: TournamentPairing
): { uuid: string, surname: string, initial: string }[] {
  return (playersByPairingUuid.get(pairing.uuid) ?? []).map((player) => {
    const { firstName, surname } = playerNameParts(player)
    return { uuid: player.value, surname, initial: firstName ? `${firstName.charAt(0)}.` : '' }
  })
}

/**
 * Roughly-square column count so N tables actually spread across the
 * available space instead of always defaulting to a fixed count regardless
 * of how many tables there are.
 */
const columns = computed(() => Math.max(1, Math.ceil(Math.sqrt(pairingsForRound.length))))
</script>

<template>
  <div class="relative h-screen w-screen bg-default overflow-hidden">
    <!-- Absolutely positioned, not a reserved header strip: with many tables (e.g. 40
         players/10 tables) every row of grid height matters, and a header row pushed the last
         grid row off screen -->
    <UTooltip
      :content="{ side: 'top' }"
      :text="t('tournament.single.roundManager.exitFullscreenTooltip')"
    >
      <UButton
        :icon="ICONS.collapse"
        color="neutral"
        variant="ghost"
        class="absolute top-2 right-2 z-10"
        :aria-label="t('tournament.single.roundManager.exitFullscreenTooltip')"
        @click="emit('exit')"
      />
    </UTooltip>

    <!-- border-dashed on the grid + each cell: visible construction lines so the layout
         (columns/rows actually assigned) can be inspected directly -->
    <div
      class="h-full w-full grid gap-2 p-4 border border-dashed border-default"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: '1fr' }"
    >
      <!-- [container-type:size] per cell (not on the page root): cqmin scales to each table's
           own grid area, which shrinks as table count grows, so text always fits its row
           instead of overflowing once there are many tables -->
      <div
        v-for="pairing in pairingsForRound"
        :key="pairing.uuid"
        class="flex items-start justify-start gap-[4cqmin] border border-dashed
          border-default @container-size overflow-hidden"
      >
        <!-- Fixed min-width, right-aligned: keeps every number's right edge (and the surnames
             after it) on one vertical line per column, regardless of 1 vs 2-digit table counts -->
        <div class="text-[38cqmin] font-bold text-warning leading-none min-w-[46cqmin] text-right">
          {{ pairing.tableNumber }}
        </div>
        <div class="flex flex-col gap-[1.5cqmin] min-w-0">
          <span
            v-for="player in tablePlayers(pairing)"
            :key="player.uuid"
            class="text-[17cqmin] font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {{ player.surname }} <span class="text-muted font-normal">{{ player.initial }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
