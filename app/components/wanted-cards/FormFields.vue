<!-- app\components\wanted-cards\FormFields.vue -->
<!--
  Shared by AddModal.vue and EditModal.vue: everything from the printing picker
  down to the notes field was identical markup+logic in both (the two modals
  only differ above this point — AddModal has a searchable card-name field,
  EditModal shows the fixed card name as read-only text).

  `state` is the SAME reactive object the parent binds to its own <UForm
  :state> — a plain prop, deliberately mutated here on its sub-fields (not
  copied) so the parent's schema validation sees the edits. That trips
  vue/no-mutating-props, disabled file-wide below: a v-model (defineModel)
  was considered instead, but the parent's `state` is a `const reactive()`
  (required by UForm), and defineModel's two-way binding only actually works
  through a `state = $event` reassignment the parent would never be able to
  make — passing a mutable object prop by reference is the correct call
  here, not a v-model.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { ScryfallPrinting } from '~/composables/useScryfallCardSearch'

interface FormFieldsState {
  printingId?: string
  copies?: number
  language?: string
  foil?: boolean
  notes?: string
  player?: string
}

const {
  state, printings, printingsLoading = false, printingDisabled = false
} = defineProps<{
  state: FormFieldsState
  printings: ScryfallPrinting[]
  printingsLoading?: boolean
  /** AddModal disables the printing picker until a card name is chosen; EditModal's
   * name is fixed, so it's never disabled there. */
  printingDisabled?: boolean
}>()

const { t } = useI18n()
const { data: associates } = useAssociatesQuery()

// "APS Pauperwave" (PW-0000) is the association's own registry record, not a real
// player — it makes no sense for it to appear as a requester.
const APS_PAUPERWAVE_UUID = '8578797c-62b0-4e48-a237-3b65683a2623'

const playerOptions = computed(() => (associates.value ?? [])
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

const currentLanguage = computed(() => languageOptions.value.find(l => l.value === state.language))

// CardTrader price for each candidate printing in the "Edition" picker — unlike
// cardmarketPrice (already in Scryfall's response) it has to be requested separately
// for each one: a best-effort preview (no language/foil filter, see the comment in
// server/api/cardtrader/price.get.ts), with the precise price arriving after saving
// via refresh-prices. undefined = not requested yet, null = requested but no listing
// found — a local per-printing cache, not cleared between searches: reopening the
// same name within this modal session does not repeat the calls. Shared by both
// Add and Edit (2026-08-10 fix: Edit was silently missing this price before the
// two modals' printing pickers were unified into this component).
const cardtraderPrices = ref<Record<string, number | null>>({})
watch(() => printings, (list) => {
  for (const printing of list) {
    if (printing.id in cardtraderPrices.value) continue
    $fetch<{ price: number | null }>('/api/cardtrader/price', {
      query: { scryfallId: printing.id, setCode: printing.set }
    })
      .then(({ price }) => { cardtraderPrices.value[printing.id] = price })
      .catch(() => { cardtraderPrices.value[printing.id] = null })
  }
}, { immediate: true })

const printingItems = computed(() => printings.map(printing => ({
  label: printing.setName,
  collectorNumber: printing.collectorNumber,
  imageUrl: printing.imageUrl,
  cardmarketPrice: printing.price,
  cardtraderPrice: cardtraderPrices.value[printing.id] ?? null,
  value: printing.id
})))

const selectedPrinting = computed(() =>
  printings.find(printing => printing.id === state.printingId))

// "Treatment" (full art, extended art, borderless, etc.) is gone: those are all
// properties of the specific printing, already chosen with the "Edition" selector —
// a separate menu would be redundant. "Foil" stays, because it is a finish
// independent of the printing (the same printing often exists both foil and
// non-foil) — available only if the chosen printing supports it.
watch(() => state.printingId, (printingId) => {
  const printing = printings.find(p => p.id === printingId)
  if (!printing?.finishes.includes('foil')) state.foil = false
})

const foilUnavailableHint = computed(() =>
  selectedPrinting.value && !selectedPrinting.value.finishes.includes('foil')
    ? t('wantedCard.addModal.foilUnavailable')
    : undefined)
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField :label="$t('wantedCard.addModal.fields.printing')" name="printingId" required>
    <USelectMenu
      v-model="state.printingId"
      :items="printingItems"
      value-key="value"
      :filter-fields="['label', 'collectorNumber']"
      :disabled="printingDisabled"
      :loading="printingsLoading"
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
</template>
