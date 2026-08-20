<!-- app\components\leagues\fields\LeagueDataFields.vue -->
<!--
  Extracted out of AddModal.vue so EditModal.vue can share it (2026-08-16,
  same reasoning as tournaments/fields/TournamentDataFields.vue) — `state` is
  the SAME reactive object the parent binds to its own <UForm :state>,
  mutated directly. No start-date field here (2026-08-16 ADR, docs/PROGRESS.md):
  a league's dates are derived from its tournaments, not user-editable.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { StatusColor } from '~/types'
import type { LeagueFormState } from '~/composables/leagues/useLeagueFormFields'

interface SelectOption {
  value: string
  label: string
}

interface StatusOption extends SelectOption {
  icon: string
  color: StatusColor
}

const {
  state, statusOptions, rulesetOptions
} = defineProps<{
  state: LeagueFormState
  statusOptions: StatusOption[]
  rulesetOptions: SelectOption[]
}>()

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as TournamentsFieldsTournamentDataFields.vue's `image`,
// including the imageCardName/imageCardArtist attribution pair — see
// CardArtPicker.vue.
const image = defineModel<string | undefined>('image')
const imageCardName = defineModel<string | undefined>('imageCardName')
const imageCardArtist = defineModel<string | undefined>('imageCardArtist')
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField :label="$t('league.addModal.fields.image')" name="image">
    <MagicCardArtPicker
      v-model="image"
      v-model:card-name="imageCardName"
      v-model:artist="imageCardArtist"
    />
  </UFormField>

  <UStatusSelect
    v-model="state.status"
    :items="statusOptions"
    name="status"
    :label="$t('league.addModal.fields.status')"
    class="w-full"
  />

  <!-- eslint-disable-next-line -->
  <UFormField :label="$t('league.addModal.fields.name')" name="name" required>
    <UInput
      v-model="state.name"
      class="w-full"
      :placeholder="$t('league.addModal.fields.namePlaceholder')"
      :icon="ICONS.standings"
    />
  </UFormField>

  <UFormField :label="$t('league.addModal.fields.ruleset')" name="rulesetUuid">
    <USelectMenu
      v-model="state.rulesetUuid"
      class="w-full"
      :items="rulesetOptions"
      value-key="value"
      :placeholder="$t('league.addModal.fields.selectRuleset')"
      :icon="ICONS.bookOpen"
    />
  </UFormField>
</template>
