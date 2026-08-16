<!-- app\components\wanted-cards\list\ConfirmModals.vue -->
<!--
  Extracted out of wanted-cards/index.vue (2026-08-16) — the single-card
  delete confirm and the bulk status/delete confirm, both ternary-heavy on
  pendingAction?.type === 'delete' to share one ConfirmModal between bulk
  status changes and bulk delete (useWantedCardsBulkActions.ts). See
  FiltersBar.vue's own header for why this got split out.
-->
<script setup lang="ts">
import type { WantedCard } from '~/types'
import type { PendingBulkAction } from '~/composables/wantedCards/useWantedCardsBulkActions'

const { deletingCard, pendingAction } = defineProps<{
  deletingCard: WantedCard | null
  pendingAction: PendingBulkAction | null
  onConfirmDelete: () => void
  onConfirmPendingAction: () => void
}>()

const deleteConfirmOpen = defineModel<boolean>('deleteConfirmOpen', { required: true })
const bulkConfirmOpen = defineModel<boolean>('bulkConfirmOpen', { required: true })
</script>

<template>
  <ConfirmModal
    v-model:open="deleteConfirmOpen"
    :title="$t('wantedCard.contextMenu.deleteConfirmTitle')"
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('wantedCard.contextMenu.delete')"
    :confirm-icon="ICONS.delete"
    @confirm="onConfirmDelete"
  >
    <MagicCardPreviewTooltip
      v-if="deletingCard"
      :name="deletingCard.cardName"
      :image-url="deletingCard.imageUrl"
    />
  </ConfirmModal>

  <!-- Same component as the single-card delete confirm above, generalized for
       both bulk status changes and bulk delete (useWantedCardsBulkActions.ts). -->
  <ConfirmModal
    v-model:open="bulkConfirmOpen"
    :title="pendingAction?.type === 'delete'
      ? $t('wantedCard.bulkActions.confirmDeleteTitle', pendingAction.cards.length)
      : $t('wantedCard.bulkActions.confirmStatusTitle', {
        status: $t(`wantedCard.status.${pendingAction?.status}`)
      }, pendingAction?.cards.length ?? 0)"
    :warning="pendingAction?.type === 'delete' ? $t('common.confirmDeleteWarning') : undefined"
    :confirm-label="pendingAction?.type === 'delete'
      ? $t('wantedCard.contextMenu.delete')
      : $t('wantedCard.bulkActions.confirm')"
    :confirm-color="pendingAction?.type === 'delete' ? 'error' : 'primary'"
    :confirm-icon="pendingAction?.type === 'delete' ? ICONS.delete : undefined"
    @confirm="onConfirmPendingAction"
  >
    <ul v-if="pendingAction" class="max-h-40 overflow-y-auto text-sm space-y-1">
      <li v-for="card in pendingAction.cards" :key="card.id">
        <MagicCardPreviewTooltip :name="card.cardName" :image-url="card.imageUrl" />
      </li>
    </ul>
  </ConfirmModal>
</template>
