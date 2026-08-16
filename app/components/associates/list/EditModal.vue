<!-- app\components\associates\list\EditModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import { format, parseISO } from 'date-fns'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Associate } from '~/types'

const open = defineModel<boolean>({ default: false })
const { associate } = defineProps<{ associate: Associate | null }>()

const toast = useToast()
const { t } = useI18n()
const { updateAssociate } = useAssociatesMutations()

// Same fields/validation as AddModal.vue (shared schema) — see its own comment
// for why born_date is widened to Date | undefined here.
const schema = v.object(associateFormSchema(t))

type Schema = v.InferOutput<typeof schema>

const associateTypeOptions = useAssociateTypeOptions()

const state = createAssociateFormState()

// Refills the form state every time the modal opens on a different associate —
// unlike AddModal.vue there is no successful submit that clears it (this one
// always reopens on an existing record), same pattern as wanted-cards' EditModal.
watch([open, () => associate], ([isOpen, current]) => {
  if (!isOpen || !current) return
  state.associate_type = current.associate_type ?? 'regular'
  state.first_name = current.first_name
  state.last_name = current.last_name
  state.email_address = current.email_address
  state.phone_number = current.phone_number ?? ''
  state.tax_code = current.tax_code ?? ''
  state.born_location = current.born_location ?? ''
  state.born_date = current.born_date ? parseISO(current.born_date) : undefined
  state.born_province = current.born_province ?? ''
  state.born_state = current.born_state ?? ''
  state.residency_address = current.residency_address
  state.residency_house_number = current.residency_house_number
  state.residency_city = current.residency_city
  state.residency_province = current.residency_province
  state.residency_cap = current.residency_cap
  state.mtgo_nickname = current.mtgo_nickname
  state.mtga_nickname = current.mtga_nickname
  state.has_read_statute = current.has_read_statute
  state.consent_data = current.consent_data
  state.consent_social = current.consent_social
}, { immediate: true })

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!associate) return

  submitting.value = true
  try {
    await updateAssociate.mutateAsync({
      id: associate.id,
      edits: {
        ...event.data,
        born_date: format(event.data.born_date, 'yyyy-MM-dd'),
        consent_social: event.data.consent_social ?? false
      }
    })

    toast.add({
      title: t('associate.editModal.successToastTitle'),
      description: t('associate.editModal.successToastDescription', {
        name: `${event.data.first_name} ${event.data.last_name}`
      }),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('associate.editModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-2xl' }"
    :title="$t('associate.editModal.title')"
    :description="associate ? `${associate.first_name} ${associate.last_name}` : ''"
  >
    <template #body>
      <UForm
        v-if="associate"
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
        <div>
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
        <div>
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.birthInfo') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsBirthInfoFields :state="state" />
          </div>
        </div>

        <!-- Tax information -->
        <div>
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.fiscalInfo') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsTaxCodeField :state="state" />
          </div>
        </div>

        <!-- Residency -->
        <div>
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.residencyInfo') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsResidencyFields :state="state" />
          </div>
        </div>

        <!-- Nickname MTG -->
        <div>
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.mtgNicknames') }}
          </h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <AssociatesFieldsMtgNicknameFields :state="state" />
          </div>
        </div>

        <!-- Consents -->
        <div>
          <h3 class="text-lg font-semibold text-primary">
            {{ $t('associate.addModal.sections.consents') }}
          </h3>
          <!-- has_read_statute/consent_data are locked here, unlike AddModal: they are
               the legal declarations the associate made when applying (statute read,
               data processing consent) — staff editing the record afterwards shouldn't
               be able to retroactively toggle them off. consent_social stays editable,
               it's an ongoing marketing preference, not a one-time declaration. -->
          <div class="mt-2 space-y-2">
            <UFormField name="has_read_statute">
              <UCheckbox
                v-model="state.has_read_statute"
                required
                disabled
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
                disabled
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
            :label="$t('associate.editModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('associate.editModal.save')"
            color="primary"
            variant="solid"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
