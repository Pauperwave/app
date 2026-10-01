<!-- app\components\tournaments\single\pairing\ReportPeople.vue -->
<!-- People as small AssociateTags, or "Nessuno" when empty — for the player report. -->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'

const { people } = defineProps<{
  people: LiveCommanderStanding[]
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="people.length > 0" class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <AssociateTag
      v-for="person in people"
      :key="person.playerUuid"
      :name="person.firstName"
      :surname="person.surname"
      :associate-uuid="person.associateUuid"
      size="xs"
    />
  </div>
  <span v-else class="text-muted">{{ t('tournament.single.roundManager.reportNobody') }}</span>
</template>
