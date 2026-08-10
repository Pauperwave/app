<!-- app\components\wanted-cards\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const { createWantedCard } = useWantedCardsMutations()
const currentAssociate = useCurrentAssociate()

// v.string(msg)/v.number(msg) also customise the TYPE error (not just constraints
// like minLength/minValue) — previously, with Zod, a never-selected field
// (undefined) failed the type check before even reaching .min(), showing the
// library's generic message ("Invalid input: expected string, received undefined")
// instead of ours (observed on "Edition" in production, 2026-08-08). Every v.pipe()
// here covers both cases with the same message, wherever the field is required.
// The printingId/copies/language/foil/notes/player fields come from
// wantedCardFormFieldsSchema, shared with EditModal.vue — `name` is Add-only
// (Edit's card name is fixed, not part of its schema).
const schema = v.object({
  name: v.pipe(
    v.string(t('wantedCard.addModal.validation.nameRequired')),
    v.minLength(2, t('wantedCard.addModal.validation.nameTooShort'))
  ),
  ...wantedCardFormFieldsSchema(t)
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  printingId: undefined,
  copies: 1,
  language: 'any',
  foil: false,
  notes: undefined,
  player: undefined
})

// Prefills "Player" with the logged-in user as soon as the modal opens — not at
// component setup, because associates/authUser may not be resolved by then. It does
// not overwrite a choice already made by hand (!state.player), so reopening the
// modal after changing it does not reset it to the logged-in user.
watch([open, currentAssociate], ([isOpen, associate]) => {
  if (isOpen && associate && !state.player) state.player = associate.uuid
})

// Live Scryfall search — see the comment in useScryfallCardSearch.ts on why not a
// local catalogue like the commanders in league.
const {
  query, nameSuggestions, isSuggesting, printings, isLoadingPrintings, fetchPrintings
} = useScryfallCardSearch()

// value-key on the name: this keeps state.name a string even though the items also
// carry the mana cost to show in the row.
const nameItems = computed(() => nameSuggestions.value.map(suggestion => ({
  label: suggestion.name,
  manaCost: suggestion.manaCost,
  imageUrl: suggestion.imageUrl,
  value: suggestion.name
})))

// A card picked from the autocomplete (almost) always has several printings: as
// soon as the name is confirmed the exact edition/artwork is chosen too, clearing
// the previous selection (a different name invalidates the printing already
// picked).
watch(() => state.name, (name) => {
  state.printingId = undefined
  fetchPrintings(name)
})

const submitting = ref(false)

// `state` is a reactive object that persists on the component instance — UModal
// only hides and shows, it does not unmount and remount the form — so it has to be
// cleared explicitly after a successful submit, otherwise the next opening starts
// from the last request entered.
function resetForm() {
  state.name = undefined
  state.printingId = undefined
  state.copies = 1
  state.language = 'any'
  state.foil = false
  state.notes = undefined
  state.player = undefined
  query.value = ''
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const printing = printings.value.find(p => p.id === event.data.printingId)
  if (!printing) return

  submitting.value = true
  try {
    await createWantedCard.mutateAsync({
      playerAssociateUuid: event.data.player,
      cardName: printing.name,
      scryfallUrl: printing.scryfallUrl,
      scryfallId: printing.id,
      setCode: printing.set,
      manaCost: printing.manaCost,
      colorIdentity: printing.colorIdentity,
      cmc: printing.cmc,
      imageUrl: printing.imageUrl,
      cardmarketPrice: printing.price,
      copies: event.data.copies,
      language: event.data.language === 'any' ? null : event.data.language,
      treatment: event.data.foil ? ['foil'] : [],
      notes: event.data.notes || null
    })

    toast.add({
      title: t('wantedCard.addModal.successToastTitle'),
      description: t('wantedCard.addModal.successToastDescription', { name: printing.name }),
      color: 'success'
    })
    open.value = false
    resetForm()
  } catch (err) {
    toast.add({
      title: t('wantedCard.addModal.errorToastTitle'),
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
    :title="$t('wantedCard.addModal.title')"
    :description="$t('wantedCard.addModal.description')"
    :ui="{ content: 'max-w-xl' }"
  >
    <AddButton
      id="tour-wanted-cards-add"
      :label="$t('wantedCard.addModal.openButton')"
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
        <UFormField :label="$t('wantedCard.addModal.fields.name')" name="name" required>
          <USelectMenu
            v-model="state.name"
            v-model:search-term="query"
            :items="nameItems"
            value-key="value"
            :loading="isSuggesting"
            ignore-filter
            :placeholder="$t('wantedCard.addModal.fields.namePlaceholder')"
            :icon="ICONS.cardSearch"
            class="w-full"
          >
            <template #item-label="{ item }">
              <MagicCardHoverPreview
                :image-url="item.imageUrl"
                :alt="item.label"
                class="flex items-center gap-2 min-w-0"
              >
                <!-- Dark background behind the symbols, as in league: the
                     white/colorless ones would vanish on the light theme. -->
                <span v-if="item.manaCost" class="shrink-0 bg-gray-950 p-1 rounded">
                  <MagicManaCost :mana-cost="item.manaCost" size="sm" />
                </span>
                <span class="truncate">{{ item.label }}</span>
              </MagicCardHoverPreview>
            </template>
          </USelectMenu>
        </UFormField>

        <WantedCardsFormFields
          :state="state"
          :printings="printings"
          :printings-loading="isLoadingPrintings"
          :printing-disabled="!state.name"
        />

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('wantedCard.addModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="open = false; resetForm()"
          />
          <UButton
            :label="$t('wantedCard.addModal.create')"
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
