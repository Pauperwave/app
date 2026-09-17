<!-- app\components\tournaments\single\pairing\RoundStatusCard.vue -->
<!--
  "Stato inserimento" — sidebar summary of round-entry progress: 4
  collapsible sections (rankings/kills per table, commanders/votes per
  player), each row clickable to open the matching modal — lets the
  organizer see at a glance what's left to enter this round instead of
  scanning every RoundPairingCard. Ported from MagicTheGathering/league's
  RoundStatusCard.vue (user request, 2026-09-19: "manca completamente...
  la card contenitrice Tavoli... e Stato inserimento"), reading from
  useRoundStatus.ts instead of league's own Pinia stores.
-->
<script setup lang="ts">
import type { TournamentPairing } from '~/composables/tournaments/useTournamentPairingsQuery'
import type { RoundStatusFilter } from '~/utils/tournaments/roundStatusSearch'

const {
  pairingsForRound, labelFor, hasRanking, hasKills, hasCommander, hasVotes
} = defineProps<{
  pairingsForRound: TournamentPairing[]
  labelFor: (playerUuid: string) => string
  associateUuidFor: (playerUuid: string) => string | undefined
  hasRanking: (pairingUuid: string) => boolean
  hasKills: (pairingUuid: string) => boolean
  hasCommander: (pairingUuid: string, playerUuid: string) => boolean
  hasVotes: (pairingUuid: string, playerUuid: string) => boolean
}>()

const emit = defineEmits<{
  openScoreModal: [pairingUuid: string]
  openKillModal: [pairingUuid: string]
  openCommanderModal: [pairingUuid: string, playerUuid: string]
  openVotesModal: [pairingUuid: string, playerUuid: string]
}>()

const { t } = useI18n()

const isOpen = ref(true)

const pairingsRef = computed(() => pairingsForRound)
const {
  rankingItems, killItems, commanderItems, voteItems
} = useRoundStatus(pairingsRef, labelFor, hasRanking, hasKills, hasCommander, hasVotes)

// ─── Filter & search ──────────────────────────────────────────────────────
const filter = ref<RoundStatusFilter>('all')
const search = ref('')

function tableHaystack(tableNumber: number): string {
  return tableSearchLabel(tableNumber, t('tournament.single.roundManager.tableHeading', { n: tableNumber }))
}

const filteredRankingItems = computed(() =>
  rankingItems.value.filter(item =>
    matchesRoundStatusFilter(item.done, filter.value)
    && matchesRoundStatusSearch(`${item.playerNames.join(' ')} ${tableHaystack(item.tableNumber)}`, search.value)))

const filteredKillItems = computed(() =>
  killItems.value.filter(item =>
    matchesRoundStatusFilter(item.done, filter.value)
    && matchesRoundStatusSearch(`${item.playerNames.join(' ')} ${tableHaystack(item.tableNumber)}`, search.value)))

const filteredCommanderItems = computed(() =>
  commanderItems.value.filter(item =>
    matchesRoundStatusFilter(item.done, filter.value)
    && matchesRoundStatusSearch(`${item.label} ${tableHaystack(item.tableNumber)}`, search.value)))

const filteredVoteItems = computed(() =>
  voteItems.value.filter(item =>
    matchesRoundStatusFilter(item.done, filter.value)
    && matchesRoundStatusSearch(`${item.label} ${tableHaystack(item.tableNumber)}`, search.value)))
</script>

<template>
  <div v-if="pairingsForRound.length > 0" class="bg-elevated rounded-xl p-2.5 border border-default shadow-lg">
    <UCollapsible v-model:open="isOpen">
      <button type="button" class="flex items-center gap-1.5 w-full cursor-pointer">
        <UIcon :name="ICONS.list" class="size-4 text-primary" />
        <h4 class="text-sm font-bold">
          {{ t('tournament.single.roundManager.roundStatus.title') }}
        </h4>
        <UIcon
          :name="ICONS.chevronDown"
          class="size-3.5 text-muted transition-transform"
          :class="isOpen ? '' : '-rotate-90'"
        />
      </button>

      <template #content>
        <div class="space-y-2.5 pt-2.5">
          <UFieldGroup class="w-full">
            <UButton
              :label="t('tournament.single.roundManager.roundStatus.filterAll')"
              size="xs"
              class="flex-1 justify-center"
              :color="filter === 'all' ? 'primary' : 'neutral'"
              :variant="filter === 'all' ? 'solid' : 'outline'"
              @click="filter = 'all'"
            />
            <UButton
              :label="t('tournament.single.roundManager.roundStatus.filterPending')"
              size="xs"
              class="flex-1 justify-center"
              :color="filter === 'pending' ? 'primary' : 'neutral'"
              :variant="filter === 'pending' ? 'solid' : 'outline'"
              @click="filter = 'pending'"
            />
            <UButton
              :label="t('tournament.single.roundManager.roundStatus.filterDone')"
              size="xs"
              class="flex-1 justify-center"
              :color="filter === 'done' ? 'primary' : 'neutral'"
              :variant="filter === 'done' ? 'solid' : 'outline'"
              @click="filter = 'done'"
            />
          </UFieldGroup>

          <UInput
            v-model="search"
            type="search"
            :icon="ICONS.search"
            :placeholder="t('tournament.single.roundManager.roundStatus.searchPlaceholder')"
            size="sm"
            class="w-full"
          />

          <div class="space-y-1">
            <TournamentsSinglePairingRoundStatusSection
              :title="t('tournament.single.roundManager.roundStatus.sections.rankings')"
              :icon="ICONS.standings"
              :done-count="rankingItems.filter(i => i.done).length"
              :total-count="rankingItems.length"
              :force-open="search !== '' && filteredRankingItems.length > 0"
            >
              <TournamentsSinglePairingRoundStatusRow
                v-for="item in filteredRankingItems"
                :key="item.pairingUuid"
                :done="item.done"
                :table-number="item.tableNumber"
                @select="emit('openScoreModal', item.pairingUuid)"
              />
            </TournamentsSinglePairingRoundStatusSection>

            <TournamentsSinglePairingRoundStatusSection
              :title="t('tournament.single.roundManager.roundStatus.sections.kills')"
              :icon="ICONS.kills"
              :done-count="killItems.filter(i => i.done).length"
              :total-count="killItems.length"
              :force-open="search !== '' && filteredKillItems.length > 0"
            >
              <TournamentsSinglePairingRoundStatusRow
                v-for="item in filteredKillItems"
                :key="item.pairingUuid"
                :done="item.done"
                :table-number="item.tableNumber"
                @select="emit('openKillModal', item.pairingUuid)"
              />
            </TournamentsSinglePairingRoundStatusSection>

            <TournamentsSinglePairingRoundStatusSection
              :title="t('tournament.single.roundManager.roundStatus.sections.commanders')"
              :icon="ICONS.commander"
              :done-count="commanderItems.filter(i => i.done).length"
              :total-count="commanderItems.length"
              :force-open="search !== '' && filteredCommanderItems.length > 0"
            >
              <TournamentsSinglePairingRoundStatusRow
                v-for="item in filteredCommanderItems"
                :key="`${item.pairingUuid}-${item.playerUuid}`"
                :done="item.done"
                :player-label="item.label"
                :player-uuid="associateUuidFor(item.playerUuid)"
                @select="emit('openCommanderModal', item.pairingUuid, item.playerUuid)"
              />
            </TournamentsSinglePairingRoundStatusSection>

            <TournamentsSinglePairingRoundStatusSection
              :title="t('tournament.single.roundManager.roundStatus.sections.votes')"
              :icon="ICONS.vote"
              :done-count="voteItems.filter(i => i.done).length"
              :total-count="voteItems.length"
              :force-open="search !== '' && filteredVoteItems.length > 0"
            >
              <TournamentsSinglePairingRoundStatusRow
                v-for="item in filteredVoteItems"
                :key="`${item.pairingUuid}-${item.playerUuid}`"
                :done="item.done"
                :player-label="item.label"
                :player-uuid="associateUuidFor(item.playerUuid)"
                @select="emit('openVotesModal', item.pairingUuid, item.playerUuid)"
              />
            </TournamentsSinglePairingRoundStatusSection>
          </div>
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
