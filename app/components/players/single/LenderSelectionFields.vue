<!-- app\components\players\single\LenderSelectionFields.vue -->
<!-- The "is this deck borrowed" switch + conditional lender select, shared
     by DeckCreateModal.vue/DeckEditModal.vue's own forms (fallow:dupes,
     2026-09-23) — both already share the underlying state via
     useLenderSelection.ts, this is just the markup. -->
<script setup lang="ts">
interface LenderOption {
  value: string | null
  label: string
}

const isBorrowed = defineModel<boolean>('isBorrowed', { required: true })
const lenderUuid = defineModel<string | undefined>('lenderUuid', { required: true })
const { lenderOptions } = defineProps<{ lenderOptions: LenderOption[] }>()

const { t } = useI18n()
</script>

<template>
  <UCard variant="outline">
    <div class="flex items-center gap-3">
      <USwitch v-model="isBorrowed" />
      <span class="font-medium">{{ t('deck.addModal.fields.isBorrowed') }}</span>
    </div>
  </UCard>

  <UFormField
    v-if="isBorrowed"
    :label="t('deck.addModal.fields.lender')"
    required
  >
    <USelectMenu
      v-model="lenderUuid"
      :items="lenderOptions"
      value-key="value"
      class="w-full"
    />
  </UFormField>
</template>
