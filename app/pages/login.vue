// app/pages/login.vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()

useSeoMeta({
  title: t('loginPage.seoTitle'),
  description: t('loginPage.seoDescription')
})

const supabase = useSupabaseClient()
const toast = useToast()

const fields = computed(() => [{
  name: 'email',
  type: 'email' as const,
  label: t('loginPage.emailLabel'),
  icon: 'i-lucide-at-sign',
  placeholder: t('loginPage.emailPlaceholder'),
  required: true
}])

const schema = z.object({
  email: z.string().check(
    z.trim(),
    z.email({ message: t('loginPage.invalidEmail') }),
    z.toLowerCase()
  )
})

type Schema = z.output<typeof schema>

const sendMagicLink = async (payload: FormSubmitEvent<Schema>) => {
  const { email } = payload.data
  console.log('Checking email:', email)

  // 1. Controlla se esiste nella tabella "pauperwave_associates"
  let check, checkError
  try {
    check = await $fetch<{ exists: boolean }>('/api/check-associate', {
      method: 'POST',
      body: { email }
    })
    console.log('API Response:', check)
  } catch (err) {
    console.error('Error checking associate:', err)
    checkError = err
  }

  if (checkError) {
    toast.add({
      title: t('loginPage.connectionErrorTitle'),
      description: t('loginPage.connectionErrorDescription'),
      color: 'error'
    })
    return
  }

  console.log('check?.exists:', check?.exists)

  if (!check?.exists) {
    toast.add({
      title: t('loginPage.emailNotFoundTitle'),
      description: t('loginPage.emailNotFoundDescription'),
      color: 'error'
    })
    return
  }

  // 2. Se esiste, invia il magic link
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    toast.add({
      title: t('loginPage.errorTitle'),
      description: error.message,
      color: 'error'
    })
  } else {
    toast.add({
      title: t('loginPage.linkSentTitle'),
      description: t('loginPage.linkSentDescription'),
      color: 'primary'
    })
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :title="$t('loginPage.welcomeBack')"
    icon="i-lucide-lock"
    @submit="sendMagicLink"
  >
    <template #description>
      {{ $t('loginPage.description') }}
    </template>

    <template #submit="{ loading }">
      <UButton
        :loading="loading"
        type="submit"
        color="primary"
        icon="i-lucide-mail"
        size="lg"
        block
      >
        {{ $t('loginPage.submitButton') }}
      </UButton>
    </template>
  </UAuthForm>
</template>
