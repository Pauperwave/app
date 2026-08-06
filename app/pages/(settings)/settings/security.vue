<script setup lang="ts">
import * as z from 'zod'
import type { FormError } from '@nuxt/ui'

const { t } = useI18n()

const passwordSchema = z.object({
  current: z.string().min(8, t('settingsSecurity.validation.minLength')),
  new: z.string().min(8, t('settingsSecurity.validation.minLength'))
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: undefined,
  new: undefined
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    errors.push({ name: 'new', message: t('settingsSecurity.validation.passwordsMustDiffer') })
  }
  return errors
}
</script>

<template>
  <UPageCard
    :title="$t('settingsSecurity.password.title')"
    :description="$t('settingsSecurity.password.description')"
    variant="subtle"
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      class="flex flex-col gap-4 max-w-xs"
    >
      <UFormField name="current">
        <UInput
          v-model="password.current"
          type="password"
          :placeholder="$t('settingsSecurity.password.currentPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          :placeholder="$t('settingsSecurity.password.newPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UButton :label="$t('settingsSecurity.password.update')" class="w-fit" type="submit" />
    </UForm>
  </UPageCard>

  <UPageCard
    :title="$t('settingsSecurity.account.title')"
    :description="$t('settingsSecurity.account.description')"
    class="bg-gradient-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton :label="$t('settingsSecurity.account.delete')" color="error" />
    </template>
  </UPageCard>
</template>
