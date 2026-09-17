<!-- app\components\players\single\DeckCreateModal.vue -->
<!-- Manual deck registration, restored from league's DeckCreateModal.vue
     (user request, 2026-09-17) — unlike league's plain-text commander
     inputs, this reuses TournamentsSinglePairingCommanderSearch for
     catalog-backed autocomplete, since this app already has it. -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const { playerUuid } = defineProps<{ playerUuid: string }>()

const { t } = useI18n()
const { createDeck } = usePlayerDeckMutations(() => playerUuid)
const { isBorrowed, lenderUuid, lenderOptions } = useLenderSelection(() => playerUuid)

const schema = v.object({
  companionName: v.optional(v.string()),
  decklistUrl: v.optional(v.string())
})
type Schema = v.InferOutput<typeof schema>

const state = reactive<Schema>({ companionName: undefined, decklistUrl: undefined })
const commander1Name = ref<string | null>(null)
const commander2Name = ref<string | null>(null)

const canSubmit = computed(() => {
  if (!commander1Name.value) return false
  if (isBorrowed.value && !lenderUuid.value) return false
  return true
})

function resetForm() {
  state.companionName = undefined
  state.decklistUrl = undefined
  commander1Name.value = null
  commander2Name.value = null
  isBorrowed.value = false
  lenderUuid.value = undefined
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!commander1Name.value) return

  try {
    await createDeck.mutateAsync({
      playerUuid,
      commander1Name: commander1Name.value,
      commander2Name: commander2Name.value,
      companionName: event.data.companionName || null,
      decklistUrl: event.data.decklistUrl || null,
      isBorrowed: isBorrowed.value,
      lenderUuid: isBorrowed.value ? (lenderUuid.value ?? null) : null
    })
    open.value = false
    resetForm()
  } catch {
    // useCommanderDecksMutations already toasts the error
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-lg' }"
    :title="t('deck.addModal.title')"
    :description="t('deck.addModal.description')"
  >
    <AddButton
      :label="t('deck.addModal.openButton')"
      :icon="ICONS.add"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField :label="t('deck.addModal.fields.commander1')" required>
          <TournamentsSinglePairingCommanderSearch v-model="commander1Name" />
        </UFormField>

        <UFormField :label="t('deck.addModal.fields.commander2')">
          <TournamentsSinglePairingCommanderSearch v-model="commander2Name" />
        </UFormField>

        <UFormField :label="t('deck.addModal.fields.companion')" name="companionName">
          <UInput v-model="state.companionName" class="w-full" />
        </UFormField>

        <UFormField :label="t('deck.addModal.fields.decklistUrl')" name="decklistUrl">
          <UInput v-model="state.decklistUrl" class="w-full" />
        </UFormField>

        <UCard variant="outline">
          <div class="flex items-center gap-3">
            <USwitch v-model="isBorrowed" />
            <span class="font-medium">{{ t('deck.addModal.fields.isBorrowed') }}</span>
          </div>
        </UCard>

        <UFormField
          v-if="isBorrowed"
          :label="t('deck.addModal.fields.lender')"
          required
        >
          <USelectMenu
            v-model="lenderUuid"
            :items="lenderOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('deck.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false; resetForm()"
          />
          <UButton
            :label="t('deck.addModal.create')"
            :icon="ICONS.confirm"
            type="submit"
            :disabled="!canSubmit"
            :loading="createDeck.isLoading.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
