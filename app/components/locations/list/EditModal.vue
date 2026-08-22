<!-- app\components\locations\list\EditModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Location, OpeningHours } from '~/types'
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

  const payload = buildLocationPayload(event.data, openingHours.value, image.value)

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
        class="space-y-2"
        @submit="onSubmit"
      >
        <LocationsListFormFields
          v-model:image="image"
          v-model:opening-hours="openingHours"
          :state="state"
        />

        <div class="flex justify-end gap-2">
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
