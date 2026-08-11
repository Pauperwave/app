<!-- app\components\associates\fields\ResidencyFields.vue -->
<!--
  Shared by AddModal.vue and /tesseramento — see PersonalInfoFields.vue for
  the state-mutation rationale (same pattern, `vue/no-mutating-props`
  disabled below for the same reason).
-->
<!-- eslint-disable vue/no-mutating-props -- see PersonalInfoFields.vue -->
<script setup lang="ts">
// AddModal.vue's state is a full Schema (never undefined); /tesseramento's is
// a Partial<Schema> (fields start undefined until the user reaches that step)
// — the union covers both without either file casting.
interface ResidencyState {
  residency_address?: string
  residency_house_number?: string | null
  residency_city?: string
  residency_province?: string
  residency_cap?: string
}

const { state } = defineProps<{ state: ResidencyState }>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField
    :label="$t('associate.addModal.fields.residencyAddress')"
    name="residency_address"
    required
  >
    <UInput
      v-model="state.residency_address"
      autocomplete="address-line1"
      :placeholder="$t('associate.addModal.placeholders.residencyAddress')"
      class="w-full"
    />
  </UFormField>
  <UFormField
    :label="$t('associate.addModal.fields.residencyHouseNumber')"
    name="residency_house_number"
  >
    <UInput
      :model-value="state.residency_house_number ?? ''"
      autocomplete="address-line2"
      :placeholder="$t('associate.addModal.placeholders.residencyHouseNumber')"
      class="w-full"
      @update:model-value="state.residency_house_number = ($event as string) || null"
    />
  </UFormField>
  <UFormField :label="$t('associate.addModal.fields.residencyCity')" name="residency_city" required>
    <UInput
      v-model="state.residency_city"
      autocomplete="address-level2"
      :placeholder="$t('associate.addModal.placeholders.residencyCity')"
      class="w-full"
    />
  </UFormField>
  <UFormField
    :label="$t('associate.addModal.fields.residencyProvince')"
    name="residency_province"
    required
  >
    <UInput
      v-model="state.residency_province"
      autocomplete="address-level1"
      :placeholder="$t('associate.addModal.placeholders.residencyProvince')"
      class="w-full"
    />
  </UFormField>
  <UFormField :label="$t('associate.addModal.fields.residencyCap')" name="residency_cap" required>
    <UInput
      v-model="state.residency_cap"
      autocomplete="postal-code"
      :placeholder="$t('associate.addModal.placeholders.residencyCap')"
      class="w-full"
    />
  </UFormField>
</template>
