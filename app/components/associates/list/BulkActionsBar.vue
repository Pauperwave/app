<!-- app\components\associates\list\BulkActionsBar.vue -->
<!--
  Shared by both associates list views (index.vue = roster, requests.vue =
  triage queue) — 2026-08-16, replacing requests.vue's bespoke inline bulk
  buttons and the roster's dead selection UI (row-selection + TableSelectionFooter
  with nothing wired to it). Same "dumb component, page owns the state" shape
  as TournamentsListBulkActionsBar.vue/WantedCardsListBulkActionsBar.vue, but
  one component covers two pages here since the action *set* differs (roster:
  renew, plus approveRenewal on its own "Richieste (di rinnovo)" tab
  (2026-08-27); requests: approve/reject/restore) rather than needing two
  near-identical bars — each page just sets the `show*` prop for the actions
  that apply to it.
-->
<script setup lang="ts">
const {
  count,
  total,
  side,
  showApprove = false,
  showReject = false,
  showRestore = false,
  showRenew = false,
  showApproveRenewal = false
} = defineProps<{
  count: number
  // "N di M associati selezionati" — replaces the standalone
  // TableSelectionFooter.vue row under the table (2026-09-23 user request:
  // fold that info into this bar instead of a separate row, to save
  // vertical space) — only associates/index.vue and requests.vue, the two
  // pages this bar already covers.
  total: number
  side: 'left' | 'right'
  showApprove?: boolean
  showReject?: boolean
  showRestore?: boolean
  showRenew?: boolean
  showApproveRenewal?: boolean
}>()

defineEmits<{
  clear: []
  selectAll: []
  approve: []
  reject: []
  restore: []
  renew: []
  approveRenewal: []
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('associate.selectedRows', { selected: count, total }) }}
    </span>

    <UButton
      :label="t('associate.bulkActions.selectAll')"
      color="neutral"
      variant="ghost"
      :disabled="count >= total"
      @click="$emit('selectAll')"
    />

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
      :label="withCount(t('associate.approveModal.approve'), count)"
      :icon="ICONS.confirm"
      color="success"
      variant="subtle"
      @click="$emit('approve')"
    />

    <UButton
      v-if="showReject"
      :label="withCount(t('associate.rejectModal.reject'), count)"
      :icon="ICONS.statusRejected"
      color="error"
      variant="subtle"
      @click="$emit('reject')"
    />

    <UButton
      v-if="showRestore"
      :label="withCount(t('associate.restoreModal.restore'), count)"
      :icon="ICONS.undo"
      color="success"
      variant="subtle"
      @click="$emit('restore')"
    />

    <UButton
      v-if="showRenew"
      :label="withCount(t('associate.rowActions.renew'), count)"
      :icon="ICONS.refresh"
      color="success"
      variant="subtle"
      @click="$emit('renew')"
    />

    <UButton
      v-if="showApproveRenewal"
      :label="withCount(t('associate.bulkActions.approveRenewal'), count)"
      :icon="ICONS.calendarRenew"
      color="success"
      variant="subtle"
      @click="$emit('approveRenewal')"
    />
  </div>
</template>
