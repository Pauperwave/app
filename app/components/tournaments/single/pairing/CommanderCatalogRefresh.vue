<!-- app\components\tournaments\single\pairing\CommanderCatalogRefresh.vue -->
<!--
  The "Aggiorna elenco carte" button + its confirm dialog, shared by every commander picker
  footer (TournamentCommanderModal.vue in a round, DeckCreateModal.vue on a player's profile).
  The catalog is shared/cached (useCommanderCatalogQuery), so any picker sees the refreshed list.
-->
<script setup lang="ts">
const { t } = useI18n()

const { isLoading: isRefreshingCatalog } = useCommanderWhitelists()
const { syncCatalog } = useCommanderCatalogMutations()

const showConfirm = ref(false)

async function onConfirm() {
  await syncCatalog.mutateAsync()
  showConfirm.value = false
}
</script>

<template>
  <UButton
    :icon="ICONS.refresh"
    :label="isRefreshingCatalog || syncCatalog.isLoading.value
      ? t('tournament.single.commanderModal.syncingCatalog')
      : t('tournament.single.commanderModal.syncCatalogButton')"
    variant="outline"
    color="warning"
    :loading="isRefreshingCatalog || syncCatalog.isLoading.value"
    @click="showConfirm = true"
  />

  <ConfirmModal
    v-model:open="showConfirm"
    :title="t('tournament.single.commanderModal.syncCatalogConfirm.title')"
    :description="t('tournament.single.commanderModal.syncCatalogConfirm.description')"
    :warning="t('tournament.single.commanderModal.syncCatalogConfirm.question') + '? '
      + t('tournament.single.commanderModal.syncCatalogConfirm.warning')"
    :confirm-label="t('tournament.single.commanderModal.syncCatalogConfirm.confirmLabel')"
    :confirm-icon="ICONS.refresh"
    confirm-color="warning"
    :loading="syncCatalog.isLoading.value"
    @confirm="onConfirm"
  />
</template>
