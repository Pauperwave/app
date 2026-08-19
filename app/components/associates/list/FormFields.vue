<!-- app\components\associates\list\FormFields.vue -->
<!--
  Extracted out of AddModal.vue/EditModal.vue (2026-08-19, user request — the
  modal had grown to 7 full-width stacked sections, very tall) — same
  two-column section layout as locations/list/FormFields.vue's own precedent.
  Left column: associate type, personal info, birth info. Right column:
  fiscal info, residency, consents (user request, 2026-08-19, moved fiscal
  info here from the left column). `state` is the SAME reactive
  object the parent binds to its own <UForm :state>, mutated directly by the
  field components below, same convention as LocationsListFormFields.vue.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
const { state, disableConsents = false } = defineProps<{
  state: ReturnType<typeof createAssociateFormState>
  /** EditModal.vue locks the legal declarations an associate already made
   * when applying (statute read, data consent) — staff shouldn't
   * retroactively toggle them off. AddModal.vue leaves them editable (the
   * applicant hasn't made the declaration yet). */
  disableConsents?: boolean
}>()

const associateTypeOptions = useAssociateTypeOptions()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="grid grid-cols-2 gap-x-8 gap-y-6">
    <div class="space-y-6">
      <AssociatesListFormSection :title="$t('associate.addModal.sections.associateType')">
        <UFormField :label="$t('associate.addModal.fields.associateType')" name="associate_type">
          <USelect
            v-model="state.associate_type"
            :items="associateTypeOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>
      </AssociatesListFormSection>

      <AssociatesListFormSection :title="$t('associate.addModal.sections.personalInfo')">
        <AssociatesFieldsPersonalInfoFields :state="state" />
        <UFormField :label="$t('associate.addModal.fields.email')" name="email_address" required>
          <UInput v-model="state.email_address" autocomplete="email" class="w-full" />
        </UFormField>
      </AssociatesListFormSection>

      <AssociatesListFormSection :title="$t('associate.addModal.sections.birthInfo')">
        <AssociatesFieldsBirthInfoFields :state="state" />
      </AssociatesListFormSection>
    </div>

    <div class="space-y-6">
      <AssociatesListFormSection :title="$t('associate.addModal.sections.fiscalInfo')">
        <AssociatesFieldsTaxCodeField :state="state" />
      </AssociatesListFormSection>

      <AssociatesListFormSection :title="$t('associate.addModal.sections.residencyInfo')">
        <AssociatesFieldsResidencyFields :state="state" />
      </AssociatesListFormSection>

      <AssociatesListFormSection :title="$t('associate.addModal.sections.consents')">
        <UFormField name="has_read_statute">
          <UCheckbox
            v-model="state.has_read_statute"
            required
            :disabled="disableConsents"
            :label="$t('associate.addModal.consents.statuteLabel')"
            size="lg"
          >
            <template #description>
              <!-- Same link as /tesseramento's own consents step
                   (ConsentsStep.vue) — user request, 2026-08-19: staff filling
                   this out on someone's behalf should be able to open the same
                   document the associate themselves would see. External, not
                   /tesseramento/statuto: the statute is the association's own
                   governance document, published on the blog independently of
                   this app. -->
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
            :disabled="disableConsents"
            :label="$t('associate.addModal.consents.dataLabel')"
            size="lg"
          >
            <template #description>
              <NuxtLink to="/tesseramento/informativa-dati" target="_blank" class="underline">
                {{ $t('tesseramento.steps.consents.openData') }}
              </NuxtLink>
            </template>
          </UCheckbox>
        </UFormField>
        <AssociatesFieldsConsentSocialField :state="state" />
      </AssociatesListFormSection>
    </div>
  </div>
</template>
