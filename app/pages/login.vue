<!-- app\pages\login.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()

useSeoMeta({
  title: t('login.seoTitle'),
  description: t('login.seoDescription')
})

const supabase = useSupabaseClient()
const toast = useToast()

const fields = computed(() => [{
  name: 'email',
  type: 'email' as const,
  label: t('login.emailLabel'),
  icon: ICONS.atSign,
  placeholder: t('login.emailPlaceholder'),
  required: true
}])

const schema = v.object({
  email: v.pipe(
    v.string(t('login.emailRequired')),
    v.trim(),
    v.email(t('login.invalidEmail')),
    v.toLowerCase()
  )
})

type Schema = v.InferOutput<typeof schema>

const sendMagicLink = async (payload: FormSubmitEvent<Schema>) => {
  const { email } = payload.data

  // 1. Check whether it exists in the "pauperwave_associates" table
  let check, checkError
  try {
    check = await $fetch<{ exists: boolean }>('/api/check-associate', {
      method: 'POST',
      body: { email }
    })
  } catch (err) {
    console.error('Error checking associate:', err)
    checkError = err
  }

  if (checkError) {
    toast.add({
      title: t('login.connectionErrorTitle'),
      description: t('login.connectionErrorDescription'),
      color: 'error'
    })
    return
  }

  if (!check?.exists) {
    toast.add({
      title: t('login.emailNotFoundTitle'),
      description: t('login.emailNotFoundDescription'),
      color: 'error'
    })
    return
  }

  // 2. If it exists, send the magic link
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    // Supabase's own rate-limit message ("For security purposes, you can
    // only request this after N seconds.") is raw English with no i18n key
    // of its own — every other toast in this file goes through t(), so this
    // one shouldn't be the exception that leaks untranslated text into an
    // Italian UI.
    const rateLimitSeconds = error.message.match(/after (\d+) seconds/)?.[1]
    toast.add(rateLimitSeconds
      ? {
        title: t('login.rateLimitTitle'),
        description: t('login.rateLimitDescription', { seconds: rateLimitSeconds }),
        color: 'error'
      }
      : {
        title: t('login.errorTitle'),
        description: error.message,
        color: 'error'
      })
  } else {
    toast.add({
      title: t('login.linkSentTitle'),
      description: t('login.linkSentDescription'),
      color: 'primary'
    })
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :title="$t('login.welcomeBack')"
    :icon="ICONS.lock"
    @submit="sendMagicLink"
  >
    <template #description>
      {{ $t('login.description') }}
    </template>

    <template #submit="{ loading }">
      <UButton
        :loading="loading"
        type="submit"
        color="primary"
        :icon="ICONS.mail"
        size="lg"
        block
      >
        {{ $t('login.submitButton') }}
      </UButton>
    </template>
  </UAuthForm>
</template>
