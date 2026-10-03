<!-- app\components\tournaments\fields\TournamentDataFields.vue -->
<!-- Extracted from AddModal.vue/EditModal.vue (fallow:dupes flagged a 52-line clone): `state`
     is the SAME reactive object the parent binds to its <UForm :state>, mutated directly (like
     AssociatesFieldsPersonalInfoFields.vue/LocationsFields*.vue). -->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { StatusColor } from '~/types'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

interface SelectOption {
  value: string
  label: string
}

interface StatusOption extends SelectOption {
  icon: string
  color: StatusColor
}

const {
  state, statusOptions, formatOptions
} = defineProps<{
  state: TournamentFormState
  statusOptions: StatusOption[]
  formatOptions: SelectOption[]
}>()

// Kept out of the valibot schema in useTournamentFormFields.ts (no format validation needed), like
// LocationsFieldsGeneralInfoFields.vue's `image`. imageCardName/imageCardArtist ride along:
// required attribution when the image is a Scryfall art_crop (see CardArtPicker.vue)
const { t } = useI18n()

const decklistVisibilityOptions = computed(() => (['public', 'secret'] as const).map(value => ({
  value,
  label: t(`tournament.decklistVisibility.${value}`)
})))

const image = defineModel<string | undefined>('image')
const imageCardName = defineModel<string | undefined>('imageCardName')
const imageCardArtist = defineModel<string | undefined>('imageCardArtist')
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField :label="$t('tournament.addModal.fields.image')" name="image">
    <MagicCardArtPicker
      v-model="image"
      v-model:card-name="imageCardName"
      v-model:artist="imageCardArtist"
    />
  </UFormField>

  <div class="flex justify-between gap-2">
    <UFormField
      :label="$t('tournament.addModal.fields.format')"
      name="formatUuid"
      class="flex-1"
    >
      <USelectMenu
        v-model="state.formatUuid"
        class="w-full"
        :items="formatOptions"
        value-key="value"
        :placeholder="$t('tournament.addModal.fields.selectFormat')"
        :icon="ICONS.gameplay"
      />
    </UFormField>

    <div class="flex-1">
      <UStatusSelect
        v-model="state.status"
        :items="statusOptions"
        name="status"
        :label="$t('tournament.addModal.fields.status')"
        class="w-full"
      />
    </div>
  </div>

  <div class="flex items-end gap-2">
    <!-- eslint-disable-next-line -->
    <UFormField :label="$t('tournament.addModal.fields.name')" name="name" class="flex-1" required>
      <UInput
        v-model="state.name"
        class="w-full"
        :placeholder="$t('tournament.addModal.fields.namePlaceholder')"
        :icon="ICONS.standings"
      />
    </UFormField>

    <UFormField
      :label="$t('tournament.addModal.fields.companionCode')"
      name="companionCode"
    >
      <UInput
        :model-value="state.companionCode ?? ''"
        :placeholder="$t('tournament.addModal.fields.companionCodePlaceholder')"
        :icon="ICONS.smartphone"
        class="w-42"
        @update:model-value="state.companionCode = ($event as string) || undefined"
      />
    </UFormField>
  </div>

  <div class="grid grid-cols-3 gap-2">
    <UFormField
      :label="$t('tournament.addModal.fields.entryFeeNonMember')"
      name="entryFeeNonMember"
    >
      <UInputNumber
        v-model="state.entryFeeNonMember"
        :min="0"
        :step="5"
        class="w-full"
        :icon="ICONS.euro"
        :placeholder="$t('tournament.addModal.fields.entryFeeNonMemberPlaceholder')"
      />
    </UFormField>

    <UFormField :label="$t('tournament.addModal.fields.maxEntrants')" name="maxEntrants">
      <UInputNumber
        v-model="state.maxEntrants"
        :min="1"
        class="w-full"
        :icon="ICONS.players"
        :placeholder="$t('tournament.addModal.fields.maxEntrantsPlaceholder')"
      />
    </UFormField>

    <UFormField
      :label="$t('tournament.addModal.fields.decklistVisibility')"
      name="decklistVisibility"
    >
      <USelectMenu
        v-model="state.decklistVisibility"
        :items="decklistVisibilityOptions"
        value-key="value"
        :icon="ICONS.lock"
        :placeholder="$t('tournament.addModal.fields.decklistVisibilityPlaceholder')"
        clear
        class="w-full"
      />
    </UFormField>
  </div>

  <div class="flex justify-between gap-2">
    <UFormField
      :label="$t('tournament.addModal.fields.entryFee')"
      name="entryFee"
      class="flex-1"
    >
      <UInputNumber
        v-model="state.entryFee"
        :min="0"
        :step="5"
        class="w-full"
        :icon="ICONS.euro"
      />
    </UFormField>

    <UFormField
      :label="$t('tournament.addModal.fields.prizes')"
      name="prizes"
      class="flex-1"
    >
      <UInput
        :model-value="state.prizes ?? ''"
        class="w-full"
        :placeholder="$t('tournament.addModal.fields.prizesPlaceholder')"
        :icon="ICONS.euro"
        @update:model-value="state.prizes = ($event as string) || undefined"
      />
    </UFormField>
  </div>

  <UFormField :label="$t('tournament.addModal.fields.description')" name="description">
    <UTextarea
      :model-value="state.description ?? ''"
      class="w-full"
      :rows="6"
      :placeholder="$t('tournament.addModal.fields.descriptionPlaceholder')"
      :icon="ICONS.alignLeft"
      @update:model-value="state.description = ($event as string) || undefined"
    />
  </UFormField>
</template>
