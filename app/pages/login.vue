// app/pages/login.vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Login',
  description: 'Login to your account to continue'
})

const supabase = useSupabaseClient()
const toast = useToast()

const fields = [{
  name: 'email',
  type: 'email' as const,
  label: 'Email',
  icon: 'i-lucide-at-sign',
  placeholder: 'Inserisci la tua email',
  required: true
}]

const schema = z.object({
  email: z.string().check(
    z.trim(),
    z.email({ message: 'Please enter a valid email address.' }),
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
      title: 'Errore di connessione',
      description: 'Impossibile verificare l\'email. Riprova più tardi.',
      color: 'error'
    })
    return
  }

  console.log('check?.exists:', check?.exists)

  if (!check?.exists) {
    toast.add({
      title: 'Email non trovata',
      description: 'L\'indirizzo email non risulta associato a un account PauperWave.',
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
      title: 'Errore',
      description: error.message,
      color: 'error'
    })
  } else {
    toast.add({
      title: 'Link inviato',
      description: 'Controlla la tua casella email per accedere.',
      color: 'primary'
    })
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    title="Bentornato"
    icon="i-lucide-lock"
    @submit="sendMagicLink"
  >
    <template #description>
      Utilizza l'email associata al tuo account PauperWave.
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
        Invia link per accedere
      </UButton>
    </template>
  </UAuthForm>
</template>
