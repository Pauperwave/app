<!-- app\components\associates\list\DeleteModal.vue -->
<script setup lang="ts">
interface Props {
  count?: number
}

const { count = 0 } = defineProps<Props>()
const { t } = useI18n()

const open = ref(false)

async function onSubmit() {
  await new Promise(resolve => setTimeout(resolve, 1000))
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('associate.deleteModal.title', count)"
    :description="t('associate.deleteModal.description')"
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('associate.deleteModal.cancel')"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="t('associate.deleteModal.delete')"
          color="error"
          variant="solid"
          loading-auto
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
