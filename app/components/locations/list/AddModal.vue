<!-- app\components\locations\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewLocationPayload } from '#shared/types/locations'
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'
import type { OpeningHours } from '~/types'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const { createLocation } = useLocationsMutations()
const { schema } = useLocationFormFields()

type Schema = v.InferOutput<typeof schema>

const state = reactive<LocationFormState>({
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
})

// Kept out of the valibot schema (see useLocationFormFields.ts) — neither
// needs per-field required/format validation, just merged into the payload
// on submit.
const openingHours = ref<OpeningHours>(emptyOpeningHours())
const image = ref<string | undefined>(undefined)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const payload: NewLocationPayload = {
    name: event.data.name,
    address: event.data.address,
    city: event.data.city,
    province: event.data.province,
    postalCode: event.data.postalCode,
    country: event.data.country,
    phone: event.data.phone || null,
    email: event.data.email || null,
    website: event.data.website || null,
    googleMapsUrl: event.data.googleMapsUrl || null,
    openingHours: openingHours.value,
    image: image.value || null,
    facebook: event.data.facebook || null,
    instagram: event.data.instagram || null,
    telegramChannel: event.data.telegramChannel || null,
    whatsapp: event.data.whatsapp || null,
    temporarilyClosed: event.data.temporarilyClosed ?? false
  }

  try {
    await createLocation.mutateAsync(payload)
    toast.add({
      title: t('location.addModal.successToastTitle'),
      description: t('location.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
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
        <div class="grid grid-cols-2 gap-x-8 gap-y-6">
          <!-- Left column: general info + position (the map preview makes
               this column naturally taller, so it stays paired with just
               general info rather than also carrying contacts). -->
          <div class="space-y-6">
            <LocationsListFormSection :title="$t('location.addModal.sections.generalInfo')">
              <LocationsFieldsGeneralInfoFields v-model:image="image" :state="state" />
            </LocationsListFormSection>

            <LocationsListFormSection :title="$t('location.addModal.sections.position')">
              <LocationsFieldsPositionFields :state="state" />
            </LocationsListFormSection>
          </div>

          <!-- Right column: contacts + opening hours + social -->
          <div class="space-y-6">
            <LocationsListFormSection :title="$t('location.addModal.sections.contacts')">
              <LocationsFieldsContactFields :state="state" />
            </LocationsListFormSection>

            <LocationsListFormSection :title="$t('location.addModal.sections.openingHours')">
              <LocationsFieldsOpeningHoursFields
                v-model:opening-hours="openingHours"
                :state="state"
              />
            </LocationsListFormSection>

            <LocationsListFormSection :title="$t('location.addModal.sections.social')">
              <LocationsFieldsSocialFields :state="state" />
            </LocationsListFormSection>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('location.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
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
