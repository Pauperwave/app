<!-- app\components\events\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const schema = v.object({
  name: v.pipe(
    v.string(t('event.addModal.validation.nameRequired')),
    v.minLength(2, t('event.addModal.validation.nameTooShort'))
  ),
  email: v.pipe(
    v.string(t('event.addModal.validation.emailRequired')),
    v.email(t('event.addModal.validation.invalidEmail'))
  )
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: t('event.addModal.successToastTitle'), description: t('event.addModal.successToastDescription', { name: event.data.name }), color: 'success' })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('event.addModal.title')"
    :description="$t('event.addModal.description')"
  >
    <AddButton
      :label="$t('event.addModal.openButton')"
      :icon="ICONS.calendarAdd"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField :label="$t('event.addModal.fields.name')" placeholder="John Doe" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField
          :label="$t('event.addModal.fields.email')"
          placeholder="john.doe@example.com"
          name="email"
        >
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('event.addModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="$t('event.addModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
