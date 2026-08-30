<!-- app\components\associates\list\EditModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import { format, parseISO } from 'date-fns'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Associate } from '~/types'

const open = defineModel<boolean>({ default: false })
const { associate } = defineProps<{ associate: Associate | null }>()

const { t } = useI18n()
const { updateAssociate } = useAssociatesMutations()
const { submitting, submitWithToast } = useSubmitWithToast()

// Same fields/validation as AddModal.vue (shared schema) — see its own comment
// for why born_date is widened to Date | undefined here.
const schema = associateFormObjectSchema(t)

type Schema = v.InferOutput<typeof schema>

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
  state.has_read_statute = current.has_read_statute
  state.consent_data = current.consent_data
  state.consent_social = current.consent_social
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!associate) return

  const edits = {
    ...event.data,
    born_date: format(event.data.born_date, 'yyyy-MM-dd'),
    consent_social: event.data.consent_social ?? false
  }

  await submitWithToast(
    () => updateAssociate.mutateAsync({ id: associate.id, edits }),
    {
      successTitle: t('associate.editModal.successToastTitle'),
      successDescription: t('associate.editModal.successToastDescription', {
        name: `${event.data.first_name} ${event.data.last_name}`
      }),
      errorTitle: t('associate.editModal.errorToastTitle'),
      onSuccess: () => { open.value = false }
    }
  )
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-5xl' }"
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
        <!-- has_read_statute/consent_data locked here, unlike AddModal: they are the
             legal declarations the associate made when applying (statute read, data
             processing consent) — staff editing the record afterwards shouldn't be
             able to retroactively toggle them off. consent_social stays editable,
             it's an ongoing marketing preference, not a one-time declaration. -->
        <AssociatesListFormFields :state="state" disable-consents />

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
