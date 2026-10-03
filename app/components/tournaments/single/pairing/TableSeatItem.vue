<!-- app\components\tournaments\single\pairing\TableSeatItem.vue -->
<!-- A single seat within a TableCard, occupied (draggable, AssociateTag) or empty (drop
     target), ported from league's TableSeatItem.vue. The commander-selection button is dropped:
     no commander/deck data flows through the round-1 pod preview yet. -->
<script setup lang="ts">
import type { Seat } from '~/types'

defineProps<{
  seat: Seat
  // 1-based seat at the table (player1..player4 once saved).
  seatNumber: number
  isDragging: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <!-- Styled like the seed ticket (ShuffleSeedField.vue): the seat number is the ticket's stub. -->
  <div
    v-if="seat.player"
    class="group flex min-h-11 items-stretch overflow-hidden rounded-lg bg-default ring ring-default transition hover:shadow-sm hover:ring-primary/40"
  >
    <UTooltip :text="t('tournament.single.tablePreview.seatTooltip', { n: seatNumber })">
      <span
        class="flex w-8 shrink-0 items-center justify-center border-e border-dashed border-primary/30 bg-primary/10 font-mono text-sm font-bold text-primary tabular-nums"
        :aria-label="t('tournament.single.tablePreview.seatTooltip', { n: seatNumber })"
      >
        {{ seatNumber }}
      </span>
    </UTooltip>

    <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2 py-1">
      <div class="flex min-w-0 items-center gap-1.5">
        <!-- Same first name + bold surname split as the round cards (RoundPairingCard.vue). -->
        <AssociateTag
          :name="playerNameParts(seat.player).firstName"
          :surname="playerNameParts(seat.player).surname"
          :associate-uuid="seat.player.value"
          size="md"
          class="min-w-0 text-left break-words"
        />
        <TelegramStatusIcon :associate-uuid="seat.player.value" />
      </div>
      <TournamentsSinglePairingTablePlayerStandingLine
        v-if="seat.player.standing"
        :standing="seat.player.standing"
      />
    </div>

    <UBadge
      v-if="seat.player.seed !== undefined"
      variant="subtle"
      color="warning"
      class="self-center"
    >
      #{{ seat.player.seed }}
    </UBadge>

    <button
      type="button"
      class="drag-handle flex shrink-0 cursor-grab items-center px-1.5 text-dimmed transition group-hover:text-muted hover:text-default active:cursor-grabbing"
      :aria-label="t('tournament.single.tablePreview.dragPlayerAriaLabel')"
    >
      <UIcon :name="ICONS.dragHandle" class="size-4" />
    </button>
  </div>

  <!-- Empty seat: same footprint as a player, dashed; turns primary while dragging. -->
  <div
    v-else
    class="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 text-sm transition"
    :class="isDragging
      ? 'border-primary/50 bg-primary/5 text-primary'
      : 'border-default text-dimmed'"
  >
    <UIcon :name="ICONS.add" class="size-4" />
    <span>
      {{ isDragging
        ? t('tournament.single.tablePreview.dropHere')
        : t('tournament.single.tablePreview.emptySlot') }}
    </span>
  </div>
</template>
