<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const schema = z.object({
  name: z.string().min(2, t('eventsAddModal.validation.nameTooShort')),
  email: z.string().email(t('eventsAddModal.validation.invalidEmail'))
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: t('eventsAddModal.successToastTitle'), description: t('eventsAddModal.successToastDescription', { name: event.data.name }), color: 'success' })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="$t('eventsAddModal.title')" :description="$t('eventsAddModal.description')">
    <UButton :label="$t('eventsAddModal.openButton')" icon="i-lucide-calendar-plus" @click="open = true" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField :label="$t('eventsAddModal.fields.name')" placeholder="John Doe" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField :label="$t('eventsAddModal.fields.email')" placeholder="john.doe@example.com" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('eventsAddModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="$t('eventsAddModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
