<!-- app\components\tournaments\single\pairing\ReportVoteRow.vue -->
<!-- One kind of vote (brew or play) in the player report's votes table: who the player gave it to
     and who gave it to them. The points of the votes received sit outside the table's lines. -->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'

defineProps<{
  icon: string
  iconClass: string
  label: string
  givenTo: LiveCommanderStanding[]
  receivedFrom: LiveCommanderStanding[]
  score: number
}>()

const { t } = useI18n()
</script>

<template>
  <tr>
    <th
      scope="row"
      class="border-b border-default px-3 py-2 text-left font-normal text-muted align-top"
    >
      <span class="flex items-center gap-1.5">
        <UIcon
          :name="icon"
          class="size-4"
          :class="iconClass"
        />
        {{ label }}
      </span>
    </th>
    <td class="border-b border-default px-3 py-2 align-top">
      <TournamentsSinglePairingReportPeople :people="givenTo" />
    </td>
    <td class="border-b border-default px-3 py-2 align-top">
      <TournamentsSinglePairingReportPeople :people="receivedFrom" />
    </td>
    <td class="pl-3 py-2 align-top text-right font-mono whitespace-nowrap">
      {{ t('tournament.single.roundManager.reportPoints', { points: score }) }}
    </td>
  </tr>
</template>
