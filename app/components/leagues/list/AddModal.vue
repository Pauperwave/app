<!-- app\components\leagues\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const schema = v.object({
  name: v.pipe(
    v.string(t('league.addModal.validation.nameRequired')),
    v.minLength(2, t('league.addModal.validation.nameTooShort'))
  ),
  email: v.pipe(
    v.string(t('league.addModal.validation.emailRequired')),
    v.email(t('league.addModal.validation.invalidEmail'))
  )
})

type Schema = v.InferOutput<typeof schema>

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
  <UModal
    v-model:open="open"
    :title="$t('league.addModal.title')"
    :description="$t('league.addModal.description')"
  >
    <AddButton
      :label="$t('league.addModal.openButton')"
      :icon="ICONS.standings"
      @click="open = true"
    />

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
        <UFormField
          :label="$t('league.addModal.fields.email')"
          placeholder="john.doe@example.com"
          name="email"
        >
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
