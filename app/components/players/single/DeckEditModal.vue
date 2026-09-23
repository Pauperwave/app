<!-- app\components\players\single\DeckEditModal.vue -->
<!-- Restored from league's DeckEditModal.vue (user request, 2026-09-17) —
     commander1/commander2 are deliberately not editable here (changing them
     would silently orphan any tournament_round_results already tied to this
     deck's identity, see update.post.ts). -->
<script setup lang="ts">
import type { CommanderDeck } from '~/composables/players/useCommanderDecksQuery'

const open = defineModel<boolean>({ default: false })
const { deck } = defineProps<{ deck: CommanderDeck | null }>()

const { t } = useI18n()
const { updateDeck } = usePlayerDeckMutations(() => deck?.playerUuid)
const { isBorrowed, lenderUuid, lenderOptions } = useLenderSelection(() => deck?.playerUuid)
const { submitting, submitWithToast } = useSubmitWithToast()

const companionName = ref<string | undefined>(undefined)
const decklistUrl = ref<string | undefined>(undefined)

watch([open, () => deck], ([isOpen, current]) => {
  if (!isOpen || !current) return
  companionName.value = current.companionName ?? undefined
  decklistUrl.value = current.decklistUrl ?? undefined
  isBorrowed.value = current.isBorrowed
  lenderUuid.value = current.lenderUuid ?? undefined
}, { immediate: true })

const canSubmit = computed(() => !isBorrowed.value || !!lenderUuid.value)

async function onSubmit() {
  if (!deck || !canSubmit.value) return

  await submitWithToast(() => updateDeck.mutateAsync({
    deckUuid: deck.uuid,
    companionName: companionName.value || null,
    decklistUrl: decklistUrl.value || null,
    isBorrowed: isBorrowed.value,
    lenderUuid: isBorrowed.value ? (lenderUuid.value ?? null) : null
  }), {
    successTitle: t('deck.editModal.successToastTitle'),
    errorTitle: t('deck.editModal.errorToastTitle'),
    onSuccess: () => { open.value = false }
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-lg' }"
    :title="t('deck.editModal.title')"
    :description="t('deck.editModal.description')"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormField :label="t('deck.addModal.fields.companion')">
          <UInput v-model="companionName" class="w-full" />
        </UFormField>

        <UFormField :label="t('deck.addModal.fields.decklistUrl')">
          <UInput v-model="decklistUrl" class="w-full" />
        </UFormField>

        <PlayersSingleLenderSelectionFields
          v-model:is-borrowed="isBorrowed"
          v-model:lender-uuid="lenderUuid"
          :lender-options="lenderOptions"
        />

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('deck.editModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            :label="t('deck.editModal.save')"
            :icon="ICONS.confirm"
            type="submit"
            :disabled="!canSubmit"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
