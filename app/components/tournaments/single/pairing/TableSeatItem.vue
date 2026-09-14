<!-- app\components\tournaments\single\pairing\TableSeatItem.vue -->
<!--
  A single seat within a TableCard — occupied (draggable, AssociateTag) or
  empty (drop target) — ported from MagicTheGathering/league's
  TableSeatItem.vue (user request, 2026-09-15). Commander-selection button
  dropped (out of scope for this pass — no commander/deck data flows
  through the round-1 pod preview yet).
-->
<script setup lang="ts">
import type { Seat } from '~/types'

defineProps<{
  seat: Seat
  isDragging: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="rounded-md border transition-all"
    :class="seat.player
      ? 'border-default bg-default hover:ring-2 hover:ring-amber-400 hover:shadow-md'
      : isDragging
        ? 'border-dashed border-amber-400 bg-amber-50 animate-pulse'
        : 'border-dashed border-default/70 bg-muted/20'"
  >
    <div
      v-if="seat.player"
      class="h-full min-h-10 flex items-center gap-1.5 px-1.5 py-1"
    >
      <button
        type="button"
        class="drag-handle text-muted hover:text-default transition cursor-grab hover:cursor-grab active:cursor-grabbing"
        :aria-label="t('tournament.single.tablePreview.dragPlayerAriaLabel')"
      >
        <UIcon :name="ICONS.dragHandle" class="size-4 cursor-grab hover:cursor-grab active:cursor-grabbing" />
      </button>

      <AssociateTag
        :name="seat.player.label"
        :associate-uuid="seat.player.value"
        size="md"
        class="flex-1 text-left"
      />

      <UBadge
        v-if="seat.player.seed !== undefined"
        variant="subtle"
        color="warning"
      >
        #{{ seat.player.seed }}
      </UBadge>
    </div>

    <div
      v-else
      class="h-full min-h-10 flex items-center justify-center gap-1.5 text-base px-1.5 py-1"
      :class="isDragging ? 'text-amber-700' : 'text-muted'"
    >
      <UIcon :name="ICONS.add" class="size-4" />
      <span>
        {{ isDragging
          ? t('tournament.single.tablePreview.dropHere')
          : t('tournament.single.tablePreview.emptySlot') }}
      </span>
    </div>
  </div>
</template>
