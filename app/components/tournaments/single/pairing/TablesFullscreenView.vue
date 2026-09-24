<!-- app\components\tournaments\single\pairing\TablesFullscreenView.vue -->
<!--
  A dedicated big-display readout of the current round's tables — table
  number + surnames only, meant to be read across a room (projector/TV), not
  interacted with. Separate from RoundPairingCard.vue on purpose: that
  component owns the editable table cards and all their modals/actions, this
  one is pure display. Ported 1:1 from MagicTheGathering/league's
  PairingsFullscreenView.vue (user request, 2026-09-16), adapted to this
  app's uuid-keyed pairings/players instead of league's numeric ids.
-->
<script setup lang="ts">
import type { TournamentPairing } from '~/composables/tournaments/pairing/useTournamentPairingsQuery'

const { pairingsForRound, namePartsFor } = defineProps<{
  pairingsForRound: TournamentPairing[]
  namePartsFor: (playerUuid: string) => { firstName: string, surname: string }
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
  return pairing.playerUuids.map((uuid) => {
    const { firstName, surname } = namePartsFor(uuid)
    return { uuid, surname, initial: firstName ? `${firstName.charAt(0)}.` : '' }
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
    <!-- Absolutely positioned, not a reserved header strip — with many
         tables (e.g. a 40-player/10-table tournament) every row of grid height
         matters; a dedicated header row was pushing the last grid row off
         screen. -->
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

    <!-- border-dashed on the grid + each cell: visible construction lines so
         the layout structure (columns/rows actually assigned) can be
         inspected directly, not just guessed from the class list. -->
    <div
      class="h-full w-full grid gap-2 p-4 border border-dashed border-default"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: '1fr' }"
    >
      <!-- [container-type:size] per cell (not on the page root): cqmin here
           scales to each table's own allotted grid area, which shrinks as
           table count grows — so text always fits its row instead of
           overflowing/getting cut off once there are enough tables that a
           page-relative size stops fitting. -->
      <div
        v-for="pairing in pairingsForRound"
        :key="pairing.uuid"
        class="flex items-start justify-start gap-[4cqmin] border border-dashed
          border-default @container-size overflow-hidden"
      >
        <!-- Fixed min-width, right-aligned: keeps every number's right edge
             (and the surnames starting right after it) on the same vertical
             line down each column, regardless of 1 vs 2-digit table counts. -->
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
