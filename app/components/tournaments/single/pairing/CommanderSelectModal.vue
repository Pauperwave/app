<!-- app\components\tournaments\single\pairing\CommanderSelectModal.vue -->
<!--
  Commander (+ optional partner/background/companion) selection for one
  player's round result. Rewritten 2026-09-16 (user request: "dovremmo
  copiare il catalogo di league") to use the real ported mtg_commanders
  catalog + partner/background whitelist logic (useCommanderWhitelists,
  useCommanderSearch) instead of this app's generic Scryfall name search —
  a vanilla legendary creature can't have a second commander under real
  Commander rules, and only the catalog's partner_type classification knows
  which cards can. commander_decks persistence (get-or-create per player+
  commander/partner combo, server/api/commander-decks/select.post.ts) is
  unchanged from before this rewrite. Still offers the player's own
  previously-used decks for quick reuse.
-->
<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const { playerUuid } = defineProps<{
  playerUuid: string
}>()

const emit = defineEmits<{
  confirm: [commander1Name: string, commander2Name: string | null]
}>()

const { t } = useI18n()

const { data: previousDecks } = useCommanderDecksQuery(() => playerUuid)
const { getPartnerType, getAllowedPartners, getExactPartnerName } = useCommanderWhitelists()
const { syncCatalog } = useCommanderCatalogMutations()

const commander1 = ref('')
const commander2 = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  commander1.value = ''
  commander2.value = ''
})

const commander1PartnerType = computed(() =>
  commander1.value ? getPartnerType(commander1.value) : null)
const canHaveCommander2 = computed(() =>
  commander1PartnerType.value !== null && commander1PartnerType.value !== 'commander')
const commander2Whitelist = computed(() =>
  commander1.value && canHaveCommander2.value ? getAllowedPartners(commander1.value) : [])

// "Partner with <specific card>" is a fixed, named pair — there's only ever
// one legal commander2 once commander1 is picked, so auto-fill it instead
// of making the player find it in the (still broad) whitelist themselves.
// Non-immediate: only reacts to the player actually (re)selecting
// commander1 during this modal session.
watch(commander1, (name) => {
  if (!name) return
  const partnerName = getExactPartnerName(name)
  commander2.value = partnerName ?? (canHaveCommander2.value ? commander2.value : '')
})

const {
  query: commander1Query,
  suggestions: commander1Suggestions,
  isLoading: isSuggestingCommander1
} = useCommanderSearch()
const {
  query: commander2Query,
  suggestions: commander2Suggestions,
  isLoading: isSuggestingCommander2
} = useCommanderSearch({ whitelist: commander2Whitelist })

const commander1Items = computed(() => commander1Suggestions.value.map(s => s.label))
const commander2Items = computed(() => commander2Suggestions.value.map(s => s.label))

function reuseDeck(deck: { commander1Name: string, commander2Name: string | null }) {
  commander1.value = deck.commander1Name
  commander2.value = deck.commander2Name ?? ''
}

const canConfirm = computed(() =>
  commander1.value.trim().length > 0
  && (!canHaveCommander2.value || commander2.value.trim().length > 0))

function handleConfirm() {
  if (!canConfirm.value) return
  emit('confirm', commander1.value.trim(), canHaveCommander2.value ? commander2.value.trim() : null)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.commanderModal.title')"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <div v-if="previousDecks?.length" class="flex flex-wrap gap-2">
          <UButton
            v-for="deck in previousDecks"
            :key="deck.uuid"
            size="xs"
            color="neutral"
            variant="outline"
            :label="deck.commander2Name
              ? `${deck.commander1Name} + ${deck.commander2Name}`
              : deck.commander1Name"
            @click="reuseDeck(deck)"
          />
        </div>

        <USelectMenu
          v-model="commander1"
          v-model:search-term="commander1Query"
          :items="commander1Items"
          :loading="isSuggestingCommander1"
          :placeholder="t('tournament.single.commanderModal.commanderPlaceholder')"
          create-item
        />

        <div v-if="canHaveCommander2" class="space-y-1">
          <UBadge
            v-if="commander2Whitelist.length > 0"
            size="sm"
            color="info"
            variant="soft"
          >
            {{ t('tournament.single.commanderModal.compatibleCards',
                 { count: commander2Whitelist.length }) }}
          </UBadge>
          <USelectMenu
            v-model="commander2"
            v-model:search-term="commander2Query"
            :items="commander2Items"
            :loading="isSuggestingCommander2"
            :placeholder="t('tournament.single.commanderModal.partnerPlaceholder')"
            create-item
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <UButton
          :label="t('tournament.single.commanderModal.syncCatalogButton')"
          :icon="ICONS.refresh"
          color="neutral"
          variant="ghost"
          size="xs"
          :loading="syncCatalog.isLoading.value"
          @click="syncCatalog.mutate()"
        />
        <UButton
          :label="t('common.confirm')"
          :disabled="!canConfirm"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
