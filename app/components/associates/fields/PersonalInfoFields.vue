<!-- app\components\associates\fields\PersonalInfoFields.vue -->
<!--
  Shared by AddModal.vue and /tesseramento: first_name/last_name/phone_number
  were identical markup in both. email_address is deliberately NOT here —
  AddModal lets staff type it directly, /tesseramento shows it read-only
  (already fixed by the OTP step before this point in the form) — a real
  difference, not one worth forcing into a shared prop just to look uniform.

  `state` is the SAME reactive object the parent binds to its own <UForm
  :state> — mutated directly on its sub-fields, not copied, so the parent's
  schema validation sees the edits (same rationale as wanted-cards'
  FormFields.vue).
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
// AddModal.vue's state is a full Schema (never undefined); /tesseramento's is
// a Partial<Schema> (fields start undefined until the user reaches that step)
// — the union covers both without either file casting.
interface PersonalInfoState {
  first_name?: string
  last_name?: string
  phone_number?: string
  born_date?: Date
}

const { state } = defineProps<{ state: PersonalInfoState }>()

// A minor may not have their own phone number (see isMinor.ts, shared with
// associateFormSchema.ts's own cross-field validation) — defaults to
// "required" when born_date isn't known yet (AddModal/EditModal render every
// section on one page, so this can flip either way as the form is filled;
// /tesseramento asks birthInfo after personalInfo, so it's always unset here).
const isMinorAssociate = computed(() => isMinor(state.born_date))
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField :label="$t('associate.addModal.fields.firstName')" name="first_name" required>
    <UInput v-model="state.first_name" autocomplete="given-name" class="w-full" />
  </UFormField>
  <UFormField :label="$t('associate.addModal.fields.lastName')" name="last_name" required>
    <UInput v-model="state.last_name" autocomplete="family-name" class="w-full" />
  </UFormField>
  <UFormField
    :label="$t('associate.addModal.fields.phoneNumber')"
    name="phone_number"
    :required="!isMinorAssociate"
  >
    <UPhoneInput
      :model-value="state.phone_number ?? ''"
      name="phone_number"
      @update:model-value="state.phone_number = $event"
    />
  </UFormField>
</template>
