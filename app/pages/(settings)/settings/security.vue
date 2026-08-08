<!-- app\pages\(settings)\settings\security.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormError } from '@nuxt/ui'

const { t } = useI18n()

const passwordSchema = v.object({
  current: v.pipe(
    v.string(t('settings.security.validation.minLength')),
    v.minLength(8, t('settings.security.validation.minLength'))
  ),
  new: v.pipe(
    v.string(t('settings.security.validation.minLength')),
    v.minLength(8, t('settings.security.validation.minLength'))
  )
})

type PasswordSchema = v.InferOutput<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: undefined,
  new: undefined
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    errors.push({ name: 'new', message: t('settings.security.validation.passwordsMustDiffer') })
  }
  return errors
}
</script>

<template>
  <UPageCard
    :title="$t('settings.security.password.title')"
    :description="$t('settings.security.password.description')"
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
          :placeholder="$t('settings.security.password.currentPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          :placeholder="$t('settings.security.password.newPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UButton :label="$t('settings.security.password.update')" class="w-fit" type="submit" />
    </UForm>
  </UPageCard>

  <UPageCard
    :title="$t('settings.security.account.title')"
    :description="$t('settings.security.account.description')"
    class="bg-gradient-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton :label="$t('settings.security.account.delete')" color="error" />
    </template>
  </UPageCard>
</template>
