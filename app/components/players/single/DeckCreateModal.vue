<!-- app\components\players\single\DeckCreateModal.vue -->
<!-- Manual deck registration, restored from league's DeckCreateModal.vue and redone in the look
     and logic of the round's commander modal: the same wide modal, the same two commander
     pickers side by side with the partner/background rules
     (TournamentsSinglePairingCommanderModal) and the same footer with the catalog refresh, plus
     the deck's own fields (companion, Moxfield decklist link, borrowed-deck switch). -->
<script setup lang="ts">
import type CommanderModal from '~/components/tournaments/single/pairing/CommanderModal.vue'

const open = defineModel<boolean>({ default: false })
const { playerUuid } = defineProps<{ playerUuid: string }>()

const { t } = useI18n()
const { createDeck } = usePlayerDeckMutations(() => playerUuid)
const { isBorrowed, lenderUuid, lenderOptions } = useLenderSelection(() => playerUuid)

const commanderModalRef = useTemplateRef<InstanceType<typeof CommanderModal>>('commanderModalRef')

const companionName = ref('')
const decklistUrl = ref('')

// A deck needs its first commander; a second one too when the first requires it (partner,
// background…).
const canSubmit = computed(() => {
  const commanders = commanderModalRef.value
  if (!commanders?.commander1 || !commanders.canSubmit) return false
  return !isBorrowed.value || !!lenderUuid.value
})

function resetForm() {
  companionName.value = ''
  decklistUrl.value = ''
  isBorrowed.value = false
  lenderUuid.value = undefined
}

// The picker unmounts with the modal (and forgets its commanders), so the rest starts over too.
watch(open, (isOpen) => {
  if (!isOpen) resetForm()
})

// CommanderModal emits the chosen commanders; the deck's own fields come from here.
async function onCommanders(commander1: string | null, commander2: string | null) {
  if (!commander1) return

  try {
    await createDeck.mutateAsync({
      playerUuid,
      commander1Name: commander1,
      commander2Name: commander2,
      companionName: companionName.value.trim() || null,
      decklistUrl: decklistUrl.value.trim() || null,
      isBorrowed: isBorrowed.value,
      lenderUuid: isBorrowed.value ? (lenderUuid.value ?? null) : null
    })
    open.value = false
  } catch {
    // usePlayerDeckMutations already toasts the error
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('deck.addModal.title')"
    :description="t('deck.addModal.description')"
    :scrollable="true"
    :ui="{
      content: 'w-[calc(100vw-2rem)] max-w-4xl rounded-lg shadow-lg ring ring-default',
      body: 'flex-1 p-4 sm:p-6'
    }"
    :content="{ onCloseAutoFocus: (e: Event) => e.preventDefault() }"
  >
    <AddButton
      :label="t('deck.addModal.openButton')"
      :icon="ICONS.add"
      @click="open = true"
    />

    <template #body>
      <div class="space-y-4">
        <TournamentsSinglePairingCommanderModal
          ref="commanderModalRef"
          :player-uuid="playerUuid"
          player-name=""
          @submit="onCommanders"
        />

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('deck.addModal.fields.decklistUrl')">
            <UInput
              v-model="decklistUrl"
              :icon="ICONS.link"
              :placeholder="t('deck.addModal.fields.decklistUrlPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('deck.addModal.fields.companion')">
            <UInput v-model="companionName" class="w-full" />
          </UFormField>
        </div>

        <div class="grid items-start gap-4 sm:grid-cols-2">
          <PlayersSingleLenderSelectionFields
            v-model:is-borrowed="isBorrowed"
            v-model:lender-uuid="lenderUuid"
            :lender-options="lenderOptions"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <CommandersCatalogRefresh />
        <div class="flex items-center gap-2">
          <UButton
            :label="t('deck.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            :label="t('deck.addModal.create')"
            :icon="ICONS.confirm"
            :disabled="!canSubmit"
            :loading="createDeck.isLoading.value"
            @click="commanderModalRef?.submit()"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
