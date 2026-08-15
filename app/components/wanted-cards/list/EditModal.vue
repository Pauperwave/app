<!-- app\components\wanted-cards\list\EditModal.vue -->

<!--
  A differenza di AddModal.vue non permette di cambiare il nome della carta
  (equivarrebbe a creare una richiesta diversa) — l'edizione/stampa esatta è
  invece modificabile con lo stesso picker Scryfall di AddModal.vue.
-->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { WantedCard } from '~/types'

const open = defineModel<boolean>({ default: false })
const { card } = defineProps<{
  card: WantedCard | null
}>()

const toast = useToast()
const { t } = useI18n()

const { updateWantedCard } = useWantedCardsMutations()

// Same printing-search pattern as AddModal.vue, but the name is fixed (not
// searchable) — fetchPrintings runs straight on the existing card's name as soon as
// the modal opens.
const { printings, isLoadingPrintings, fetchPrintings } = useScryfallCardSearch()

// Same custom messages as AddModal.vue (see the comment there on why
// v.pipe(v.string(msg), v.minLength(...)) covers both the never-filled field and
// the empty string). Shared with AddModal.vue via wantedCardFormFieldsSchema — no
// `name` field here, the card name is fixed once created.
const schema = v.object(wantedCardFormFieldsSchema(t))

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({})

// Refills the form state every time the modal opens on a different card — unlike
// AddModal.vue there is no successful submit that clears it (this one always
// reopens on an existing record). Printings reload on the card's fixed name, then
// the already saved one is preselected by comparing scryfallUrl.
watch([open, () => card], async ([isOpen, currentCard]) => {
  if (!isOpen || !currentCard) return
  state.copies = currentCard.copies
  state.language = currentCard.language || 'any'
  state.foil = currentCard.treatment.includes('foil')
  state.notes = currentCard.notes || undefined
  state.player = currentCard.playerAssociateUuid

  await fetchPrintings(currentCard.cardName)
  // Compare only the base part of the URL (without the query string): the Scryfall
  // API now always appends tracking params (?utm_source=...) to the scryfall_uri it
  // returns, while some older requests (data migrated from the initial mock) have a
  // "clean" scryfallUrl saved without them — an exact string comparison would never
  // match.
  const currentBaseUrl = currentCard.scryfallUrl.split('?')[0]
  state.printingId = printings.value.find(p => p.scryfallUrl.split('?')[0] === currentBaseUrl)?.id
}, { immediate: true })

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!card) return

  const printing = printings.value.find(p => p.id === event.data.printingId)
  if (!printing) return

  submitting.value = true
  try {
    await updateWantedCard.mutateAsync({
      id: card.id,
      edits: {
        playerAssociateUuid: event.data.player,
        scryfallUrl: printing.scryfallUrl,
        scryfallId: printing.id,
        setCode: printing.set,
        manaCost: printing.manaCost,
        colorIdentity: printing.colorIdentity,
        typeLine: printing.typeLine || null,
        cmc: printing.cmc,
        imageUrl: printing.imageUrl,
        cardmarketPrice: printing.price,
        copies: event.data.copies,
        language: event.data.language === 'any' ? null : event.data.language,
        treatment: event.data.foil ? ['foil'] : [],
        notes: event.data.notes || null
      }
    })

    toast.add({
      title: t('wantedCard.editModal.successToastTitle'),
      description: t('wantedCard.editModal.successToastDescription', { name: card.cardName }),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('wantedCard.editModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
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
        class="space-y-4"
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
