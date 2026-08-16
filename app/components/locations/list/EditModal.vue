<!-- app\components\locations\list\EditModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Location, OpeningHours } from '~/types'
import type { NewLocationPayload } from '#shared/types/locations'
import type { LocationFormState } from '~/composables/locations/useLocationFormFields'

const open = defineModel<boolean>({ default: false })
const { location } = defineProps<{ location: Location | null }>()

const toast = useToast()
const { t } = useI18n()
const { updateLocation } = useLocationsMutations()
const { schema } = useLocationFormFields()

type Schema = v.InferOutput<typeof schema>

const state = reactive<LocationFormState>({
  name: undefined,
  address: undefined,
  postalCode: undefined,
  city: undefined,
  province: undefined,
  country: undefined,
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

const openingHours = ref<OpeningHours>(emptyOpeningHours())
const image = ref<string | undefined>(undefined)

// Refills every time the modal opens on a (possibly new) location — same
// convention as TournamentsListEditModal.vue's watch on its `tournament` prop.
watch([open, () => location], ([isOpen, current]) => {
  if (!isOpen || !current) return
  state.name = current.name
  state.address = current.address
  state.city = current.city
  state.province = current.province
  state.postalCode = current.postalCode
  state.country = current.country
  state.phone = current.phone ?? undefined
  state.email = current.email ?? undefined
  state.website = current.website ?? undefined
  state.googleMapsUrl = current.googleMapsUrl ?? undefined
  openingHours.value = current.openingHours ?? emptyOpeningHours()
  image.value = current.image ?? undefined
  state.facebook = current.facebook ?? undefined
  state.instagram = current.instagram ?? undefined
  state.telegramChannel = current.telegramChannel ?? undefined
  state.whatsapp = current.whatsapp ?? undefined
  state.temporarilyClosed = current.temporarilyClosed
}, { immediate: true })

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!location) return

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

  submitting.value = true
  try {
    await updateLocation.mutateAsync({ id: location.id, edits: payload })
    toast.add({
      title: t('location.editModal.successToastTitle'),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('location.editModal.errorToastTitle'),
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
    :ui="{ content: 'max-w-5xl' }"
    :title="$t('location.editModal.title')"
  >
    <template #body>
      <UForm
        v-if="location"
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
            <div>
              <h3 class="text-lg font-semibold text-primary">
                {{ $t('location.addModal.sections.generalInfo') }}
              </h3>
              <div class="space-y-4 mt-2">
                <LocationsFieldsGeneralInfoFields v-model:image="image" :state="state" />
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-primary">
                {{ $t('location.addModal.sections.position') }}
              </h3>
              <div class="space-y-4 mt-2">
                <LocationsFieldsPositionFields :state="state" />
              </div>
            </div>
          </div>

          <!-- Right column: contacts + opening hours + social -->
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-semibold text-primary">
                {{ $t('location.addModal.sections.contacts') }}
              </h3>
              <div class="space-y-4 mt-2">
                <LocationsFieldsContactFields :state="state" />
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-primary">
                {{ $t('location.addModal.sections.openingHours') }}
              </h3>
              <div class="space-y-4 mt-2">
                <LocationsFieldsOpeningHoursFields
                  v-model:opening-hours="openingHours"
                  :state="state"
                />
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-primary">
                {{ $t('location.addModal.sections.social') }}
              </h3>
              <div class="space-y-4 mt-2">
                <LocationsFieldsSocialFields :state="state" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('location.editModal.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="submitting"
            @click="() => { open = false }"
          />
          <UButton
            :label="$t('location.editModal.save')"
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
