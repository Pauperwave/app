<!-- app\components\tournaments\single\pairing\ReportRoundCard.vue -->
<!-- One round of a player's "pagella": the deck, placement and kills, the votes given and received,
     and the round's total. -->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'
import type { ReportRoundWithDeck } from '~/composables/tournaments/pairing/useCommanderPlayerReport'

const { reportRound, peopleByPlayerUuid } = defineProps<{
  reportRound: ReportRoundWithDeck
  peopleByPlayerUuid: ReadonlyMap<string, LiveCommanderStanding>
}>()

const emit = defineEmits<{
  selectPlayer: [playerUuid: string]
}>()

const { t } = useI18n()

function peopleOf(playerUuids: string[]): LiveCommanderStanding[] {
  return playerUuids.flatMap(uuid => peopleByPlayerUuid.get(uuid) ?? [])
}

function personOf(playerUuid: string | null): LiveCommanderStanding[] {
  return playerUuid ? peopleOf([playerUuid]) : []
}

function points(value: number): string {
  return t('tournament.single.roundManager.reportPoints', { points: value })
}
</script>

<template>
  <UCard :ui="{ header: 'p-3 sm:px-4', body: 'p-3 sm:p-4' }">
    <template #header>
      <TournamentsSinglePairingReportTableHover
        :round-number="reportRound.roundNumber"
        :table-number="reportRound.tableNumber"
        :opponents="peopleOf(reportRound.opponentUuids)"
        @select="playerUuid => emit('selectPlayer', playerUuid)"
      />
    </template>

    <p v-if="reportRound.position === null" class="text-sm text-muted">
      {{ t('tournament.single.roundManager.reportNoPlacement') }}
    </p>

    <dl
      v-if="reportRound.position !== null"
      class="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-2 text-sm"
    >
      <dt class="flex items-center gap-1.5 text-muted">
        <UIcon :name="ICONS.commander" class="size-4 text-primary" />
        {{ t('tournament.single.roundManager.reportDeck') }}
      </dt>
      <dd class="col-span-2">
        <TournamentsSinglePairingCommanderDeckHover
          v-if="reportRound.deck"
          :commander1-name="reportRound.deck.commander1Name"
          :commander2-name="reportRound.deck.commander2Name"
        />
        <span v-else class="text-muted">
          {{ t('tournament.single.roundManager.reportNoDeck') }}
        </span>
      </dd>

      <dt class="flex items-center gap-1.5 text-muted">
        <UIcon :name="ICONS.standings" class="size-4 text-primary" />
        {{ t('tournament.single.roundManager.reportPlacement') }}
      </dt>
      <dd>
        <TournamentsSinglePairingReportPlacement :position="reportRound.position" />
      </dd>
      <dd class="font-mono text-right">
        {{ points(reportRound.rankScore) }}
      </dd>

      <dt class="flex items-center gap-1.5 text-muted">
        <UIcon :name="ICONS.kills" class="size-4 text-warning" />
        {{ t('tournament.single.roundManager.reportKills') }}
      </dt>
      <dd>
        <TournamentsSinglePairingReportPeople :people="peopleOf(reportRound.killedPlayerUuids)" />
      </dd>
      <dd class="font-mono text-right">
        {{ points(reportRound.killScore) }}
      </dd>
    </dl>

    <table
      class="w-full table-fixed text-sm border-collapse"
      :class="{ 'mt-3': reportRound.position !== null }"
    >
      <colgroup>
        <col class="w-28">
        <col>
        <col>
        <col class="w-20">
      </colgroup>
      <thead>
        <tr>
          <th class="border-b border-default bg-elevated px-3 py-1.5" />
          <th class="border-b border-default bg-elevated px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
            {{ t('tournament.single.roundManager.reportVoteGiven') }}
          </th>
          <th class="border-b border-default bg-elevated px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
            {{ t('tournament.single.roundManager.reportVoteReceived') }}
          </th>
          <th />
        </tr>
      </thead>
      <tbody>
        <TournamentsSinglePairingReportVoteRow
          :icon="ICONS.brewVotes"
          icon-class="text-info"
          :label="t('tournament.single.roundManager.standingsBrewHeader')"
          :given-to="personOf(reportRound.brewVotedPlayerUuid)"
          :received-from="peopleOf(reportRound.brewVoterUuids)"
          :score="reportRound.brewScore"
        />
        <TournamentsSinglePairingReportVoteRow
          :icon="ICONS.playVotes"
          icon-class="text-success"
          :label="t('tournament.single.roundManager.standingsPlayHeader')"
          :given-to="personOf(reportRound.playVotedPlayerUuid)"
          :received-from="peopleOf(reportRound.playVoterUuids)"
          :score="reportRound.playScore"
        />
      </tbody>
    </table>

    <div class="flex items-center justify-between mt-3 pt-2 border-t border-default font-semibold">
      <span>{{ t('tournament.single.roundManager.reportRoundTotal') }}</span>
      <span class="font-mono">{{ points(reportRound.totalScore) }}</span>
    </div>
  </UCard>
</template>
