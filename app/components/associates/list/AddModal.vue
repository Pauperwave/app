<!-- app\components\associates\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// Shared with /tesseramento (the public self-service form) — see
// associateFormSchema.ts.
const schema = associateFormObjectSchema(t)

type Schema = v.InferOutput<typeof schema>

const associateTypeOptions = useAssociateTypeOptions()

// born_date widened to Date | undefined to match BirthInfoFields.vue's shared
// prop type (also used by /tesseramento, where the field starts unset) —
// clearing the calendar now leaves it unset instead of silently resetting to
// 1990-01-01; UForm's own schema validation (v.date()) still catches a
// missing date at submit time, same as it already does on /tesseramento.
const state = createAssociateFormState(new Date('1990-01-01'))

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    toast.add({
      title: t('associate.addModal.successToastTitle'),
      description: t('associate.addModal.successToastDescription', {
        name: `${event.data.first_name} ${event.data.last_name}`
      }),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('associate.addModal.errorToastTitle'),
      description: t('associate.addModal.errorToastDescription', {
        message: err instanceof Error ? err.message : String(err)
      }),
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-2xl' }"
    :title="$t('associate.addModal.title')"
    :description="$t('associate.addModal.description')"
  >
    <AddButton
      :label="$t('associate.addModal.openButton')"
      :icon="ICONS.addPlayer"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-2"
        @submit="onSubmit"
      >
        <!-- Associate type -->
        <div>
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.associateType') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField
              :label="$t('associate.addModal.fields.associateType')"
              name="associate_type"
            >
              <USelect
                v-model="state.associate_type"
                :items="associateTypeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Personal information -->
        <div id="personal-info-section">
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.personalInfo') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsPersonalInfoFields :state="state" />
            <UFormField
              :label="$t('associate.addModal.fields.email')"
              name="email_address"
              required
            >
              <UInput v-model="state.email_address" autocomplete="email" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Birth information -->
        <div id="birth-section">
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.birthInfo') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsBirthInfoFields :state="state" />
          </div>
        </div>

        <!-- Tax information -->
        <div id="fiscal-section">
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.fiscalInfo') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsTaxCodeField :state="state" />
          </div>
        </div>

        <!-- Residency -->
        <div id="residency-section">
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.residencyInfo') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsResidencyFields :state="state" />
          </div>
        </div>

        <!-- Nickname MTG -->
        <div id="mtg-nicknames-section">
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.mtgNicknames') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsMtgNicknameFields :state="state" />
          </div>
        </div>

        <!-- Consents -->
        <div id="consents-section">
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.consents') }}
          </h3>
          <div class="mt-2 space-y-2">
            <UFormField name="has_read_statute">
              <UCheckbox
                v-model="state.has_read_statute"
                required
                :label="$t('associate.addModal.consents.statuteLabel')"
                size="lg"
              >
                <template #description>
                  {{ $t('associate.addModal.consents.statuteDescription') }}
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="consent_data">
              <UCheckbox
                v-model="state.consent_data"
                required
                :label="$t('associate.addModal.consents.dataLabel')"
                size="lg"
              >
                <template #description>
                  {{ $t('associate.addModal.consents.dataDescription') }}
                </template>
              </UCheckbox>
            </UFormField>
            <AssociatesFieldsConsentSocialField :state="state" />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('associate.addModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="$t('associate.addModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
