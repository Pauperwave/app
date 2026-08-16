<!-- app\components\associates\list\BulkActionsBar.vue -->
<!--
  Shared by both associates list views (index.vue = roster, requests.vue =
  triage queue) — 2026-08-16, replacing requests.vue's bespoke inline bulk
  buttons and the roster's dead selection UI (row-selection + TableSelectionFooter
  with nothing wired to it). Same "dumb component, page owns the state" shape
  as TournamentsListBulkActionsBar.vue/WantedCardsListBulkActionsBar.vue, but
  one component covers two pages here since the action *set* differs (roster:
  renew only; requests: approve/reject/restore) rather than needing two
  near-identical bars — each page just sets the `show*` prop for the actions
  that apply to it.
-->
<script setup lang="ts">
const {
  count, side,
  showApprove = false, showReject = false, showRestore = false, showRenew = false
} = defineProps<{
  count: number
  side: 'left' | 'right'
  showApprove?: boolean
  showReject?: boolean
  showRestore?: boolean
  showRenew?: boolean
}>()

defineEmits<{
  clear: []
  approve: []
  reject: []
  restore: []
  renew: []
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('associate.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('associate.bulkActions.clearSelection')"
      color="neutral"
      variant="ghost"
      @click="$emit('clear')"
    />
  </div>

  <div v-else class="flex items-center gap-2 flex-wrap">
    <UButton
      v-if="showApprove"
      :label="t('associate.approveModal.approve')"
      :icon="ICONS.confirm"
      color="success"
      variant="subtle"
      @click="$emit('approve')"
    />

    <UButton
      v-if="showReject"
      :label="t('associate.rejectModal.reject')"
      :icon="ICONS.statusRejected"
      color="error"
      variant="subtle"
      @click="$emit('reject')"
    />

    <UButton
      v-if="showRestore"
      :label="t('associate.restoreModal.restore')"
      :icon="ICONS.undo"
      color="success"
      variant="subtle"
      @click="$emit('restore')"
    />

    <UButton
      v-if="showRenew"
      :label="t('associate.rowActions.renew')"
      :icon="ICONS.refresh"
      color="success"
      variant="subtle"
      @click="$emit('renew')"
    />
  </div>
</template>
