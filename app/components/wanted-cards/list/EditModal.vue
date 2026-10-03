<!-- app\components\wanted-cards\list\EditModal.vue -->

<!-- Unlike AddModal.vue it doesn't allow changing the card name (that would amount to creating
     a different request); the exact edition/printing is editable with the same Scryfall picker
     as AddModal.vue. -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { WantedCard } from '~/types'

const open = defineModel<boolean>({ default: false })
const { card } = defineProps<{
  card: WantedCard | null
}>()

const { t } = useI18n()

const { updateWantedCard } = useWantedCardsMutations()
const { submitting, submitWithToast } = useSubmitWithToast()

// Same printing-search pattern as AddModal.vue, but the name is fixed (not
// searchable) — fetchPrintings runs straight on the existing card's name as soon as
// the modal opens.
const { printings, isLoadingPrintings, fetchPrintings } = useScryfallCardSearch()

// Same custom messages as AddModal.vue (see why v.pipe(v.string(msg), v.minLength(...)) covers both
// the never-filled field and the empty string), shared via wantedCardFormFieldsSchema. No `name`
// field: the card name is fixed once created
const schema = v.object(wantedCardFormFieldsSchema(t))

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({})

// Refills the form state every time the modal opens on a different card: unlike AddModal.vue no
// successful submit clears it (this one always reopens on an existing record). fetchPrintings()
// only sets the query key (useScryfallCardSearch.ts) and returns at once without waiting for the
// fetch, so `await`ing it was a no-op: `printings` was empty and the preselect silently failed on
// the first open of a session (it worked the second time only because Pinia Colada had cached that
// name). Preselecting happens in the printings watcher below, like AddModal.vue
watch([open, () => card], ([isOpen, currentCard]) => {
  if (!isOpen || !currentCard) return
  state.copies = currentCard.copies
  state.language = currentCard.language || 'any'
  state.foil = currentCard.treatment.includes('foil')
  state.notes = currentCard.notes || undefined
  state.player = currentCard.playerAssociateUuid

  fetchPrintings(currentCard.cardName)
}, { immediate: true })

// Runs once `printings` loads for the card's name: compares only the base of the URL (without the
// query string), since the Scryfall API now appends tracking params (?utm_source=...) to
// scryfall_uri while some older requests (migrated from the initial mock) have a "clean"
// scryfallUrl: an exact comparison would never match. Guarded on the modal still being open on the
// same card, so a stale fetch resolving after it moved on (or closed) can't clobber
// state.printingId
watch(printings, (list) => {
  if (!open.value || !card) return
  const currentBaseUrl = card.scryfallUrl.split('?')[0]
  state.printingId = list.find(p => p.scryfallUrl.split('?')[0] === currentBaseUrl)?.id
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!card) return

  const printing = printings.value.find(p => p.id === event.data.printingId)
  if (!printing) return

  const edits = wantedCardEditsFromPrinting(printing, event.data)

  await submitWithToast(
    () => updateWantedCard.mutateAsync({ id: card.id, edits }),
    {
      successTitle: t('wantedCard.editModal.successToastTitle'),
      successDescription: t('wantedCard.editModal.successToastDescription', { name: card.cardName }),
      errorTitle: t('wantedCard.editModal.errorToastTitle'),
      onSuccess: () => { open.value = false }
    }
  )
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('wantedCard.editModal.title')"
    :description="card ? card.cardName : ''"
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <UForm
        v-if="card"
        :schema="schema"
        :state="state"
        class="space-y-2"
        @submit="onSubmit"
      >
        <div>
          <p class="font-semibold truncate">
            {{ card.cardName }}
          </p>
          <p class="text-sm text-muted">
            {{ $t('wantedCard.editModal.cardReadOnlyHint') }}
          </p>
        </div>

        <WantedCardsFormFields
          :state="state"
          :printings="printings"
          :printings-loading="isLoadingPrintings"
        />

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('wantedCard.addModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('wantedCard.editModal.save')"
            color="primary"
            variant="solid"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
