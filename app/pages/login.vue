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

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // TODO change to false if you want to restrict access
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
      title: 'Email inviata',
      description: 'Controlla la tua casella di posta per il link magico.',
      color: 'success'
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
      Non hai un account?
      <ULink to="/signup" class="text-primary font-medium">Registrati</ULink>.
    </template>

    <template #footer>
      Accedendo, accetti i nostri
      <ULink to="/terms-of-service" class="text-primary font-medium">
        Termini di servizio
      </ULink>.
    </template>

    <template #submit>
      <UButton
        type="submit"
        color="primary"
        icon="i-lucide-log-in"
        size="lg"
        block
      >
        Invia link magico
      </UButton>
    </template>
  </UAuthForm>
</template>
