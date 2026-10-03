<!-- app\components\tournaments\single\AcceptanceSearchAddRow.vue -->
<!-- Search box + "Aggiungi giocatori" associate picker, shared by both of
     AcceptancePicker.vue's tables: "Pre-registrati" (adds to the pre-registration list) and
     "Iscritti (Pagato)" (adds as a walk-in). Grid, not flex, for the row layout: plain
     flex-1/min-w-0 let the select's comma-joined value text overflow its flex-basis and push
     the button off the right edge once several associates were selected; `minmax(0, 1fr)` is
     the one column sizing that caps a track at the remaining space regardless of content width. -->
<script setup lang="ts">
interface AssociateOption {
  value: string
  label: string
}

const { options, disabled = false } = defineProps<{
  options: AssociateOption[]
  disabled?: boolean
}>()

const emit = defineEmits<{ add: [] }>()

const search = defineModel<string>('search', { required: true })
const selectedIds = defineModel<string[]>('selectedIds', { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
    <SearchInput
      v-model="search"
      :placeholder="t('tournament.single.acceptancePicker.searchPlaceholder')"
      class="w-48"
    />

    <USelectMenu
      v-model="selectedIds"
      :items="options"
      value-key="value"
      multiple
      :icon="ICONS.addPlayer"
      :placeholder="t('tournament.single.acceptancePicker.addPlayersPlaceholder')"
      :search-input="{
        placeholder: t('tournament.single.acceptancePicker.addPlayersSearchPlaceholder')
      }"
      :disabled="disabled"
      class="min-w-0"
    />

    <div class="flex items-center gap-2">
      <UButton
        color="primary"
        :icon="ICONS.playerConfirmed"
        :label="t(
          'tournament.single.acceptancePicker.addPlayersCount', { count: selectedIds.length }
        )"
        :disabled="disabled || !selectedIds.length"
        class="w-36 justify-center"
        @click="emit('add')"
      />
      <span v-if="!options.length" class="text-sm text-muted whitespace-nowrap">
        {{ t('tournament.single.acceptancePicker.addPlayersNoneAvailable') }}
      </span>
    </div>
  </div>
</template>
