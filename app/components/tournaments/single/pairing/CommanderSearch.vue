<!-- app\components\tournaments\single\pairing\CommanderSearch.vue -->
<!-- Ported bit-by-bit from MagicTheGathering/league (user request
     2026-09-16), swapping numeric playerId/tablePlayerIds for this app's
     uuid-keyed players.uuid. -->
<script setup lang="ts">
const props = defineProps<{
  whitelist?: string[] | null
  playerUuid?: string | null
  /** Every player seated at the same table/round — see useCommanderSearch's
   *  `tablePlayerUuids` option for why this is worth passing. */
  tablePlayerUuids?: string[]
}>()

const modelValue = defineModel<string | null>()

// Captured once at mount, not reactive: a commander already set (modal
// reopened on an existing entry) shouldn't yank focus/pop the dropdown open
// on top of the illustration the user just wanted to see — only an empty
// field (adding a new commander) should.
const hadInitialValue = !!modelValue.value

const { t } = useI18n()

const {
  query,
  suggestionGroups,
  isLoading,
  handleSelect,
  card
} = useCommanderSearch({
  whitelist: () => props.whitelist,
  playerUuid: () => props.playerUuid,
  tablePlayerUuids: () => props.tablePlayerUuids ?? []
})

// USelectMenu's modelValue is `string | undefined` (labelKey values aren't
// nullable) — bridge to the component's `string | null` external contract.
const selected = computed({
  get: () => modelValue.value ?? undefined,
  set: (v: string | undefined) => { modelValue.value = v ?? null }
})

// Fetches the full card (for CommanderCardPreview) whenever a commander is
// picked — separate from `query`, which is only the search-box text
// (USelectMenu shows the selected value in its own trigger button, not in
// the search input).
watch(modelValue, (name) => {
  if (name) handleSelect(name)
}, { immediate: true })
</script>

<template>
  <div>
    <USelectMenu
      v-model="selected"
      v-model:search-term="query"
      :items="suggestionGroups"
      ignore-filter
      value-key="label"
      :loading="isLoading"
      :placeholder="t('tournament.single.commanderModal.commanderPlaceholder')"
      :default-open="!hadInitialValue"
      :autofocus="!hadInitialValue"
      class="w-full"
      :ui="{ content: 'max-h-96' }"
    >
      <template #item-label="{ item }">
        <TournamentsSinglePairingCommanderSuggestionRow
          :label="item.label"
          :tokens="item.tokens"
          :match-indices="item.matchIndices"
          :image-url="item.imageUrl"
        />
      </template>
    </USelectMenu>

    <!-- Preview of the selected card -->
    <TournamentsSinglePairingCommanderCardPreview :card="card" />
  </div>
</template>
