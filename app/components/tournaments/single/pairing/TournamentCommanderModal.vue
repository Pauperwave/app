<!-- app\components\tournaments\single\pairing\TournamentCommanderModal.vue -->
<!--
  Ported bit-by-bit from MagicTheGathering/league's TournamentCommanderModal.vue
  (user request 2026-09-16: "anche comandanti"), replacing this app's earlier
  CommanderSelectModal.vue. Swaps league's Pinia commandersStore for this
  app's own commander_decks-backed flow (get-or-create per player+commander
  combo, unchanged from before this rewrite) and gates the catalog refresh
  behind a ConfirmModal like league's own footer does.
-->
<script setup lang="ts">
import type CommanderModal from '~/components/tournaments/single/pairing/CommanderModal.vue'

const open = defineModel<boolean>('open', { default: false })

const {
  playerUuid, firstName, surname, commander1 = null, commander2 = null, tablePlayerUuids = []
} = defineProps<{
  playerUuid: string
  firstName: string
  surname: string
  commander1?: string | null
  commander2?: string | null
  /** Every player seated at the same table/round as `playerUuid` — see
   *  useCommanderSearch's `tablePlayerUuids` option for why this is worth passing. */
  tablePlayerUuids?: string[]
}>()

const emit = defineEmits<{
  submit: [commander1: string | null, commander2: string | null]
}>()

const { t } = useI18n()

const commanderModalRef = useTemplateRef<InstanceType<typeof CommanderModal>>('commanderModalRef')

// Blocks "Salva" until commander2 is filled in, when commander1 requires a
// second card (partner/background/companion/etc.) — see CommanderModal's
// canSubmit for the actual rule.
const canSubmit = computed(() => commanderModalRef.value?.canSubmit ?? false)

function onSubmit() {
  commanderModalRef.value?.submit()
}

function handleSubmit(cmd1: string | null, cmd2: string | null) {
  emit('submit', cmd1, cmd2)
  open.value = false
}

// Whitelist catalog is shared/cached (useCommanderCatalogQuery) — this only
// needs isLoading/refetch for the footer's refresh button; CommanderModal
// itself calls the same composable for whitelists/getPartnerType.
const { isLoading: isRefreshingCatalog } = useCommanderWhitelists()
const { syncCatalog } = useCommanderCatalogMutations()

const showRefreshCatalogConfirm = ref(false)

async function onConfirmRefreshCatalog() {
  await syncCatalog.mutateAsync()
  showRefreshCatalogConfirm.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.commanderModal.title')"
    :scrollable="true"
    :ui="{
      content: 'w-[calc(100vw-2rem)] max-w-4xl rounded-lg shadow-lg ring ring-default',
      body: 'flex-1 p-4 sm:p-6'
    }"
    :content="{ onCloseAutoFocus: (e: Event) => e.preventDefault() }"
  >
    <template #description>
      <AssociateTag
        :name="firstName"
        :surname="surname"
        :associate-uuid="playerUuid"
        size="xs"
      />
    </template>

    <template #body>
      <TournamentsSinglePairingCommanderModal
        ref="commanderModalRef"
        :player-uuid="playerUuid"
        :player-name="`${firstName} ${surname}`.trim()"
        :commander1="commander1"
        :commander2="commander2"
        :table-player-uuids="tablePlayerUuids"
        @submit="handleSubmit"
      />
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <UButton
          :icon="ICONS.refresh"
          :label="isRefreshingCatalog || syncCatalog.isLoading.value
            ? t('tournament.single.commanderModal.syncingCatalog')
            : t('tournament.single.commanderModal.syncCatalogButton')"
          variant="outline"
          color="warning"
          :loading="isRefreshingCatalog || syncCatalog.isLoading.value"
          @click="showRefreshCatalogConfirm = true"
        />
        <UButton
          :label="t('common.confirm')"
          :disabled="!canSubmit"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>

  <ConfirmModal
    v-model:open="showRefreshCatalogConfirm"
    :title="t('tournament.single.commanderModal.syncCatalogConfirm.title')"
    :description="t('tournament.single.commanderModal.syncCatalogConfirm.description')"
    :warning="t('tournament.single.commanderModal.syncCatalogConfirm.question') + '? '
      + t('tournament.single.commanderModal.syncCatalogConfirm.warning')"
    :confirm-label="t('tournament.single.commanderModal.syncCatalogConfirm.confirmLabel')"
    :confirm-icon="ICONS.refresh"
    confirm-color="warning"
    :loading="syncCatalog.isLoading.value"
    @confirm="onConfirmRefreshCatalog"
  />
</template>
