<!-- app\components\associates\list\ApproveModal.vue -->
<script setup lang="ts">
interface Props {
  ids: number[]
}

const { ids } = defineProps<Props>()
// v-model, not an internal ref + default-slot trigger (2026-08-16) — needed
// so the shared AssociatesListBulkActionsBar's @approve can open this from
// requests.vue, same as reject/restore's plain ConfirmModal/function already
// work. Kept its own component (not folded into ConfirmModal.vue) since it
// needs both a cancel AND an approve button with independent labels/colors,
// not ConfirmModal's single confirm+cancel pair.
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const toast = useToast()
const { approveAssociates } = useAssociatesMutations()

const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await approveAssociates.mutateAsync(ids)

    toast.add({
      title: t('associate.approveModal.successToastTitle'),
      description: t('associate.approveModal.successToastDescription', ids.length),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('associate.approveModal.errorToastTitle'),
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
    :title="t('associate.approveModal.title', ids.length)"
    :description="t('associate.approveModal.description')"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('associate.approveModal.cancel')"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="t('associate.approveModal.approve')"
          color="success"
          variant="solid"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
