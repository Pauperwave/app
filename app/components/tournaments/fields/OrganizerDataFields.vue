<!-- app\components\tournaments\fields\OrganizerDataFields.vue -->
<!--
  Extracted out of AddModal.vue/EditModal.vue (2026-08-16, fallow:dupes
  flagged this block as a 30-line clone) — `state` is the SAME reactive
  object the parent binds to its own <UForm :state>, mutated directly.

  league/event fields (2026-08-22, user request — "there is no way of
  adding tournaments to leagues"): leagueUuid/eventUuid already round-tripped
  through AddModal.vue/EditModal.vue's payloads and the server endpoints
  already cascade a league change into recomputeLeagueDates (ADR-019), but
  no form field ever set them — the i18n keys for this row
  (fields.league/linkLeague/event/linkEvent) already existed, unused, before
  this change. Both optional and independent, same "polymorphic parent"
  reasoning as the root CLAUDE.md's routing section.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
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
  leagueOptions: SelectOption[]
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
        value-key="value"
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
        :placeholder="$t('tournament.addModal.fields.linkEvent')"
        :icon="ICONS.calendar"
      />
    </UFormField>
  </div>
</template>
