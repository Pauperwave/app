<!-- app\components\tournaments\single\pairing\RoundStatusRow.vue -->
<!--
  Generic clickable row shared by all 4 RoundStatusCard sections — renders
  either a table label (rankings/kills) or a player tag (commanders/votes)
  depending on which props are passed — ported from
  MagicTheGathering/league's RoundStatusRow.vue (user request, 2026-09-19),
  same visual language as WinnerChecklistCard.vue's own rows.
-->
<script setup lang="ts">
const {
  done, tableNumber, playerLabel, playerUuid
} = defineProps<{
  done: boolean
  tableNumber?: number
  playerLabel?: string
  playerUuid?: string
}>()

const emit = defineEmits<{
  select: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="flex items-center justify-between gap-2 p-1.5 rounded-lg cursor-pointer"
    :class="done ? 'bg-success/10' : 'bg-muted/30'"
    @click="emit('select')"
  >
    <div class="flex items-center gap-1.5 min-w-0">
      <div v-if="tableNumber !== undefined" class="flex items-center gap-1 shrink-0">
        <UIcon :name="ICONS.tableView" class="size-3.5 text-primary" />
        <span class="text-sm font-semibold">
          {{ t('tournament.single.roundManager.tableHeading', { n: tableNumber }) }}
        </span>
      </div>
      <AssociateTag
        v-else
        :name="playerLabel ?? ''"
        :associate-uuid="playerUuid"
        size="xs"
        class="truncate"
      />
    </div>

    <UIcon
      :name="done ? ICONS.confirm : ICONS.clock"
      class="size-4 shrink-0"
      :class="done ? 'text-success' : 'text-muted'"
    />
  </div>
</template>
