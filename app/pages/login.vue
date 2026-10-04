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

// The dashboard is not optimized for phones yet: a phone sees a notice first, with a way through
const { isMobile } = useDevice()
const proceedAnyway = ref(false)
const showMobileNotice = computed(() => isMobile && !proceedAnyway.value)

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
    // Supabase's rate-limit message ("For security purposes, you can only request this after N
    // seconds.") is raw English with no i18n key: every other toast here goes through t(), so this
    // one mustn't leak untranslated text into an Italian UI
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
  <div
    v-if="showMobileNotice"
    class="flex flex-col items-center gap-4 text-center"
  >
    <UIcon
      :name="ICONS.smartphone"
      class="size-10 text-primary"
    />
    <h1 class="text-xl font-semibold">
      {{ $t('login.mobileNotice.title') }}
    </h1>
    <p class="text-muted text-sm">
      {{ $t('login.mobileNotice.description') }}
    </p>
    <UButton
      color="neutral"
      variant="outline"
      size="lg"
      block
      @click="proceedAnyway = true"
    >
      {{ $t('login.mobileNotice.proceed') }}
    </UButton>
  </div>

  <UAuthForm
    v-else
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
