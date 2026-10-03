<!-- app\components\tournaments\fields\OrganizerDataFields.vue -->
<!-- Extracted from AddModal.vue/EditModal.vue (fallow:dupes flagged a 30-line clone): `state`
     is the SAME reactive object the parent binds to its <UForm :state>, mutated directly.
     league/event fields: leagueUuid/eventUuid already round-tripped through the modals'
     payloads and the server endpoints already cascade a league change into recomputeLeagueDates
     (ADR-019), but no form field set them (the i18n keys
     fields.league/linkLeague/event/linkEvent existed unused). Both are optional and independent
     ("polymorphic parent", see the root CLAUDE.md routing section). -->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

interface SelectOption {
  value: string
  label: string
}

const {
  state, organizerOptions, locationOptions, leagueOptions, eventOptions
} = defineProps<{
  state: TournamentFormState
  organizerOptions: SelectOption[]
  locationOptions: SelectOption[]
  leagueOptions: SelectMenuItem[]
  eventOptions: SelectOption[]
}>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="grid grid-cols-2 gap-2">
    <UFormField :label="$t('tournament.addModal.fields.organizer')" name="organizerUuid">
      <USelectMenu
        v-model="state.organizerUuid"
        class="w-full"
        :items="organizerOptions"
        value-key="value"
        :placeholder="$t('tournament.addModal.fields.selectOrganizer')"
        :icon="ICONS.player"
      />
    </UFormField>

    <UFormField :label="$t('tournament.addModal.fields.location')" name="locationUuid">
      <USelectMenu
        v-model="state.locationUuid"
        class="w-full"
        :items="locationOptions"
        value-key="value"
        :placeholder="$t('tournament.addModal.fields.selectLocation')"
        :icon="ICONS.mapPin"
      />
    </UFormField>

    <UFormField :label="$t('tournament.addModal.fields.league')" name="leagueUuid">
      <USelectMenu
        v-model="state.leagueUuid"
        class="w-full"
        :items="leagueOptions"
        :ui="{ itemDescription: 'text-xs' }"
        value-key="value"
        clear
        :placeholder="$t('tournament.addModal.fields.linkLeague')"
        :icon="ICONS.standings"
      />
    </UFormField>

    <UFormField :label="$t('tournament.addModal.fields.event')" name="eventUuid">
      <USelectMenu
        v-model="state.eventUuid"
        class="w-full"
        :items="eventOptions"
        value-key="value"
        clear
        :placeholder="$t('tournament.addModal.fields.linkEvent')"
        :icon="ICONS.calendar"
      />
    </UFormField>
  </div>
</template>
