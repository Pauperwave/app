<!-- app\components\locations\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'
import type { OpeningHours } from '~/types'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const { createLocation } = useLocationsMutations()
const { schema } = useLocationFormFields()

type Schema = v.InferOutput<typeof schema>

function createInitialState(): LocationFormState {
  return {
    name: undefined,
    address: undefined,
    postalCode: undefined,
    city: undefined,
    province: undefined,
    // Every location seeded/entered so far is Italian (Smart Lab et al.) — a
    // default here saves re-typing it every time, not a hard assumption.
    country: 'Italy',
    phone: undefined,
    email: undefined,
    website: undefined,
    googleMapsUrl: undefined,
    facebook: undefined,
    instagram: undefined,
    telegramChannel: undefined,
    whatsapp: undefined,
    temporarilyClosed: false
  }
}

const state = reactive<LocationFormState>(createInitialState())

// Kept out of the valibot schema (see useLocationFormFields.ts) — neither
// needs per-field required/format validation, just merged into the payload
// on submit.
const openingHours = ref<OpeningHours>(emptyOpeningHours())
const image = ref<string | undefined>(undefined)

// UModal only hides/shows, it does not unmount the form, so the state has to
// be cleared explicitly — called on successful submit and on explicit
// "Annulla", but deliberately NOT on the X button or an outside click, which
// should preserve whatever the user typed (user decision 2026-08-20).
function resetForm() {
  Object.assign(state, createInitialState())
  openingHours.value = emptyOpeningHours()
  image.value = undefined
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const payload = buildLocationPayload(event.data, openingHours.value, image.value)

  try {
    await createLocation.mutateAsync(payload)
    toast.add({
      title: t('location.addModal.successToastTitle'),
      description: t('location.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
    resetForm()
  } catch (err) {
    toast.add({
      title: t('location.addModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-5xl' }"
    :title="$t('location.addModal.title')"
    :description="$t('location.addModal.description')"
  >
    <AddButton
      :label="$t('location.addModal.openButton')"
      :icon="ICONS.mapPinPlus"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <LocationsListFormFields
          v-model:image="image"
          v-model:opening-hours="openingHours"
          :state="state"
        />

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('location.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false; resetForm()"
          />
          <UButton
            :label="$t('location.addModal.create')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="createLocation.isLoading.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
