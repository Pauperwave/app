<!-- app\components\wanted-cards\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// NOTE: we search among Associates (pauperwave_associates), not Players (a separate
// section/table in the sidebar) — they are the only ones that currently have a uuid
// to link to player_associate_uuid. If requests ever need to reference a Player who
// is not (yet) an associate, this picker will need rethinking.
const { associates } = useAssociates()
const { createWantedCard } = useWantedCardsMutations()
const currentAssociate = useCurrentAssociate()

// "APS Pauperwave" (PW-0000) is the association's own registry record, not a real
// player — it makes no sense for it to appear as a requester.
const APS_PAUPERWAVE_UUID = '8578797c-62b0-4e48-a237-3b65683a2623'

const playerOptions = computed(() => associates.value
  .filter(associate => associate.uuid !== APS_PAUPERWAVE_UUID)
  .map(associate => ({
    label: `${associate.first_name} ${associate.last_name}`,
    value: associate.uuid
  })))

// Paper printing languages still active for Magic (as of 2024: only these six,
// after Russian/Korean/Traditional Chinese were dropped in 2022 and
// Portuguese/Simplified Chinese in 2024). Flags from the circle-flags set, same
// pattern as korallo.pizza's language selector.
const languageOptions = computed(() => [
  { label: t('wantedCard.languages.any'), value: 'any', icon: 'i-lucide-languages' },
  { label: t('wantedCard.languages.en'), value: 'en', icon: 'i-circle-flags-gb' },
  { label: t('wantedCard.languages.it'), value: 'it', icon: 'i-circle-flags-it' },
  { label: t('wantedCard.languages.es'), value: 'es', icon: 'i-circle-flags-es' },
  { label: t('wantedCard.languages.fr'), value: 'fr', icon: 'i-circle-flags-fr' },
  { label: t('wantedCard.languages.de'), value: 'de', icon: 'i-circle-flags-de' },
  { label: t('wantedCard.languages.ja'), value: 'ja', icon: 'i-circle-flags-jp' }
])

// v.string(msg)/v.number(msg) also customise the TYPE error (not just constraints
// like minLength/minValue) — previously, with Zod, a never-selected field
// (undefined) failed the type check before even reaching .min(), showing the
// library's generic message ("Invalid input: expected string, received undefined")
// instead of ours (observed on "Edition" in production, 2026-08-08). Every v.pipe()
// here covers both cases with the same message, wherever the field is required.
const schema = v.object({
  name: v.pipe(
    v.string(t('wantedCard.addModal.validation.nameRequired')),
    v.minLength(2, t('wantedCard.addModal.validation.nameTooShort'))
  ),
  printingId: v.pipe(
    v.string(t('wantedCard.addModal.validation.printingRequired')),
    v.minLength(1, t('wantedCard.addModal.validation.printingRequired'))
  ),
  copies: v.pipe(
    v.number(t('wantedCard.addModal.validation.copiesRequired')),
    v.integer(t('wantedCard.addModal.validation.copiesInteger')),
    v.minValue(1, t('wantedCard.addModal.validation.copiesPositive'))
  ),
  language: v.string(),
  foil: v.optional(v.boolean()),
  notes: v.optional(v.string()),
  player: v.pipe(
    v.string(t('wantedCard.addModal.validation.playerRequired')),
    v.minLength(1, t('wantedCard.addModal.validation.playerRequired'))
  )
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

const currentLanguage = computed(() => languageOptions.value.find(l => l.value === state.language))

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
// carry the mana cost to show in the row (same shape as printingItems below).
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

// "Treatment" (full art, extended art, borderless, etc.) is gone: those are all
// properties of the specific printing, already chosen with the "Edition" selector —
// a separate menu would be redundant. "Foil" stays, because it is a finish
// independent of the printing (the same printing often exists both foil and
// non-foil) — available only if the chosen printing supports it.
watch(() => state.printingId, (printingId) => {
  const printing = printings.value.find(p => p.id === printingId)
  if (!printing?.finishes.includes('foil')) state.foil = false
})

// CardTrader price for each candidate printing in the "Edition" picker — unlike
// cardmarketPrice (already in Scryfall's response) it has to be requested separately
// for each one: a best-effort preview (no language/foil filter, see the comment in
// server/api/cardtrader/price.get.ts), with the precise price arriving after saving
// via refresh-prices. undefined = not requested yet, null = requested but no listing
// found — a local per-printing cache, not cleared between searches: reopening the
// same name within this modal session does not repeat the calls.
const cardtraderPrices = ref<Record<string, number | null>>({})
watch(printings, (list) => {
  for (const printing of list) {
    if (printing.id in cardtraderPrices.value) continue
    $fetch<{ price: number | null }>('/api/cardtrader/price', {
      query: { scryfallId: printing.id, setCode: printing.set }
    })
      .then(({ price }) => { cardtraderPrices.value[printing.id] = price })
      .catch(() => { cardtraderPrices.value[printing.id] = null })
  }
})

const printingItems = computed(() => printings.value.map(printing => ({
  label: printing.setName,
  collectorNumber: printing.collectorNumber,
  imageUrl: printing.imageUrl,
  cardmarketPrice: printing.price,
  cardtraderPrice: cardtraderPrices.value[printing.id] ?? null,
  value: printing.id
})))

const selectedPrinting = computed(() =>
  printings.value.find(printing => printing.id === state.printingId))

const foilUnavailableHint = computed(() =>
  selectedPrinting.value && !selectedPrinting.value.finishes.includes('foil')
    ? t('wantedCard.addModal.foilUnavailable')
    : undefined)

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
    <UButton
      id="tour-wanted-cards-add"
      :label="$t('wantedCard.openButton')"
      icon="i-lucide-plus"
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
            icon="i-lucide-scan-search"
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

        <UFormField :label="$t('wantedCard.addModal.fields.printing')" name="printingId" required>
          <USelectMenu
            v-model="state.printingId"
            :items="printingItems"
            value-key="value"
            :filter-fields="['label', 'collectorNumber']"
            :disabled="!state.name"
            :loading="isLoadingPrintings"
            :placeholder="$t('wantedCard.addModal.fields.printingPlaceholder')"
            class="w-full"
          >
            <template #item-label="{ item }">
              <WantedCardsListPrintingRow
                :label="item.label"
                :collector-number="item.collectorNumber"
                :image-url="item.imageUrl"
                :cardmarket-price="item.cardmarketPrice"
                :cardtrader-price="item.cardtraderPrice"
              />
            </template>
          </USelectMenu>
        </UFormField>

        <MagicCardPreview :printing="selectedPrinting ?? null" />

        <div class="grid grid-cols-3 gap-2">
          <UFormField :label="$t('wantedCard.addModal.fields.copies')" name="copies">
            <UInputNumber v-model="state.copies" :min="1" class="w-full" />
          </UFormField>

          <UFormField :label="$t('wantedCard.addModal.fields.language')" name="language">
            <USelectMenu
              v-model="state.language"
              :items="languageOptions"
              value-key="value"
              :search-input="false"
              :icon="currentLanguage?.icon"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('wantedCard.treatments.foil')"
            name="foil"
            :description="foilUnavailableHint"
          >
            <USwitch
              v-model="state.foil"
              :disabled="!selectedPrinting?.finishes.includes('foil')"
            />
          </UFormField>
        </div>

        <UFormField :label="$t('wantedCard.addModal.fields.player')" name="player" required>
          <USelectMenu
            v-model="state.player"
            :items="playerOptions"
            value-key="value"
            :placeholder="$t('wantedCard.addModal.fields.selectPlayer')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('wantedCard.addModal.fields.notes')" name="notes">
          <UTextarea
            v-model="state.notes"
            :placeholder="$t('wantedCard.addModal.fields.notesPlaceholder')"
            class="w-full"
          />
        </UFormField>

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
