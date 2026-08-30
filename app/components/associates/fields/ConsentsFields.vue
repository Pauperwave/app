<!-- app\components\associates\fields\ConsentsFields.vue -->
<!--
  Statute + data-consent checkboxes, shared by associates/list/FormFields.vue
  and tesseramento/ConsentsStep.vue (extracted 2026-08-29, fallow:dupes) —
  byte-identical except `disabled`: EditModal.vue's own disableConsents locks
  these once an associate has already made the declaration (staff shouldn't
  retroactively toggle them off), while the public /tesseramento
  self-service flow never disables them (the applicant hasn't declared yet).
-->
<!-- eslint-disable vue/no-mutating-props -- state is the caller's shared UForm state -->
<script setup lang="ts">
interface ConsentsFieldsState {
  has_read_statute?: boolean
  consent_data?: boolean
  consent_social?: boolean
}

const { state, disabled = false } = defineProps<{
  state: ConsentsFieldsState
  disabled?: boolean
}>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <UFormField name="has_read_statute">
    <UCheckbox
      v-model="state.has_read_statute"
      required
      :disabled="disabled"
      :label="$t('associate.addModal.consents.statuteLabel')"
      size="lg"
    >
      <template #description>
        <!-- External, not /tesseramento/statuto: the statute is the
             association's own governance document, published on the blog
             independently of this app — linking to that canonical copy
             avoids two versions drifting apart. The icon marks it as
             leaving the app's domain, unlike the data-consent link below
             (still an internal page). -->
        <a
          href="https://blog.pauperwave.org/docs/statuto"
          target="_blank"
          rel="noopener noreferrer"
          class="underline inline-flex items-center gap-1"
        >
          {{ $t('tesseramento.steps.consents.openStatuto') }}
          <UIcon :name="ICONS.externalLink" class="size-3.5" />
        </a>
      </template>
    </UCheckbox>
  </UFormField>
  <UFormField name="consent_data">
    <UCheckbox
      v-model="state.consent_data"
      required
      :disabled="disabled"
      :label="$t('associate.addModal.consents.dataLabel')"
      size="lg"
    >
      <template #description>
        <NuxtLink
          to="/tesseramento/informativa-dati"
          target="_blank"
          class="underline"
        >
          {{ $t('tesseramento.steps.consents.openData') }}
        </NuxtLink>
      </template>
    </UCheckbox>
  </UFormField>
  <AssociatesFieldsConsentSocialField :state="state" />
</template>
