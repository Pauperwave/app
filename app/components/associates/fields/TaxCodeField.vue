<!-- app\components\associates\fields\TaxCodeField.vue -->
<!--
  Shared by AddModal.vue and /tesseramento — see PersonalInfoFields.vue for
  the state-mutation rationale (same pattern, `vue/no-mutating-props`
  disabled below for the same reason).
-->
<!-- eslint-disable vue/no-mutating-props -- see PersonalInfoFields.vue -->
<script setup lang="ts">
interface TaxCodeState {
  tax_code?: string
}

const { state } = defineProps<{ state: TaxCodeState }>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField
    :label="$t('associate.addModal.fields.taxCode')"
    name="tax_code"
    required
  >
    <UInput
      v-model="state.tax_code"
      :placeholder="$t('associate.addModal.placeholders.taxCode')"
      class="w-full"
    />
  </UFormField>
</template>
