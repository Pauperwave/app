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

// born_date widened to Date | undefined to match BirthInfoFields.vue's shared
// prop type (also used by /tesseramento, where the field starts unset) —
// clearing the calendar now leaves it unset instead of silently resetting to
// 1990-01-01; UForm's own schema validation (v.date()) still catches a
// missing date at submit time, same as it already does on /tesseramento.
const state = createAssociateFormState(new Date('1990-01-01'))

// UModal only hides/shows, it does not unmount the form, so the state has to
// be cleared explicitly — called on successful submit and on explicit
// "Annulla", but deliberately NOT on the X button or an outside click, which
// should preserve whatever the user typed (user decision 2026-08-20).
function resetForm() {
  Object.assign(state, createAssociateFormState(new Date('1990-01-01')))
}

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
    resetForm()
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
            @click="open = false; resetForm()"
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
