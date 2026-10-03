<!-- app\components\associates\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import { format } from 'date-fns'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const { t } = useI18n()
const { createAssociate } = useAssociatesMutations()
const { submitting, submitWithToast } = useSubmitWithToast()

// Shared with /tesseramento (the public self-service form) — see
// associateFormSchema.ts.
const schema = associateFormObjectSchema(t)

type Schema = v.InferOutput<typeof schema>

// born_date is Date | undefined to match BirthInfoFields.vue's shared prop type (also used by
// /tesseramento, where the field starts unset): clearing the calendar leaves it unset instead of
// silently resetting to 1990-01-01; UForm's schema validation (v.date()) still catches a missing
// date at submit
const state = createAssociateFormState(new Date('1990-01-01'))

// UModal only hides/shows and doesn't unmount the form, so the state is cleared explicitly: on
// successful submit and "Annulla", deliberately NOT on the X button or an outside click, which
// preserve what the user typed
function resetForm() {
  Object.assign(state, createAssociateFormState(new Date('1990-01-01')))
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const edits = {
    ...event.data,
    born_date: format(event.data.born_date, 'yyyy-MM-dd'),
    consent_social: event.data.consent_social ?? false
  }

  await submitWithToast(
    () => createAssociate.mutateAsync(edits),
    {
      successTitle: t('associate.addModal.successToastTitle'),
      successDescription: t('associate.addModal.successToastDescription', {
        name: `${event.data.first_name} ${event.data.last_name}`
      }),
      errorTitle: t('associate.addModal.errorToastTitle'),
      onSuccess: () => {
        open.value = false
        resetForm()
      }
    }
  )
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-5xl' }"
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
        <AssociatesListFormFields :state="state" />

        <!-- Actions -->
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('associate.addModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="open = false; resetForm()"
          />
          <UButton
            :label="$t('associate.addModal.create')"
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
