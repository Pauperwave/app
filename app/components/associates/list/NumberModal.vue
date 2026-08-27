<!-- app\components\associates\list\NumberModal.vue -->
<!-- Own modal, opened from the row context menu — split out of EditModal.vue
     (user request, 2026-08-27) since pauperwave_associate_number isn't part
     of the shared application-form schema (a new applicant never sets it,
     see approve.post.ts's auto-assignment) and needs its own real-time
     duplicate check against every other associate's number, which the
     shared form has no equivalent of. -->
<script setup lang="ts">
import type { Associate } from '~/types'

const open = defineModel<boolean>({ default: false })
const { associate } = defineProps<{ associate: Associate | null }>()

const { t } = useI18n()
const toast = useToast()
const { data: associates } = useAssociatesQuery()
const { updateAssociateNumber } = useAssociatesMutations()

const number = ref('')
watch([open, () => associate], ([isOpen, current]) => {
  if (!isOpen || !current) return
  number.value = current.pauperwave_associate_number ?? ''
}, { immediate: true })

const trimmedNumber = computed(() => number.value.trim())

// Every OTHER associate's number — excludes the row being edited so keeping
// its own current value doesn't flag itself as a duplicate.
const takenNumbers = computed(() => new Set(
  (associates.value ?? [])
    .filter(item => item.id !== associate?.id)
    .map(item => item.pauperwave_associate_number)
    .filter((value): value is string => !!value)
))

const isDuplicate = computed(() =>
  trimmedNumber.value !== '' && takenNumbers.value.has(trimmedNumber.value))

const submitting = ref(false)
async function onSubmit() {
  if (!associate || isDuplicate.value) return

  submitting.value = true
  try {
    await updateAssociateNumber.mutateAsync({
      id: associate.id,
      number: trimmedNumber.value || null
    })
    toast.add({
      title: t('associate.numberModal.successToastTitle'),
      description: t('associate.numberModal.successToastDescription', {
        name: `${associate.first_name} ${associate.last_name}`
      }),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('associate.numberModal.errorToastTitle'),
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
    :title="$t('associate.numberModal.title')"
    :description="associate ? `${associate.first_name} ${associate.last_name}` : ''"
  >
    <template #body>
      <UFormField
        :label="$t('associate.columns.pauperwaveAssociateNumber')"
        :error="isDuplicate ? $t('associate.numberModal.duplicateError') : undefined"
      >
        <UInput v-model="number" placeholder="PW-0000" class="w-full" />
      </UFormField>

      <div class="flex justify-end gap-2 mt-4">
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
          :disabled="isDuplicate"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
