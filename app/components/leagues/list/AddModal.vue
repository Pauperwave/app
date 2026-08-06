<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const schema = z.object({
  name: z.string().min(2, t('league.addModal.validation.nameTooShort')),
  email: z.string().email(t('league.addModal.validation.invalidEmail'))
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: t('league.addModal.successToastTitle'), description: t('league.addModal.successToastDescription', { name: event.data.name }), color: 'success' })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="$t('league.addModal.title')" :description="$t('league.addModal.description')">
    <UButton :label="$t('league.addModal.openButton')" icon="i-lucide-trophy" @click="() => { open = true }" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField :label="$t('league.addModal.fields.name')" placeholder="John Doe" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField :label="$t('league.addModal.fields.email')" placeholder="john.doe@example.com" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('league.addModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="() => { open = false }"
          />
          <UButton
            :label="$t('league.addModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
