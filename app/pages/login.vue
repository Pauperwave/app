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

// const user = useSupabaseUser()

// watchEffect(() => {
//   if (user.value) {
//     navigateTo('/')
//   }
// })

const sendMagicLink = async (payload: FormSubmitEvent<Schema>) => {
  const { email } = payload.data
  console.log('Sending magic link to:', email)

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
  <!-- <div v-if="isProcessing" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 mb-4 mx-auto" />
      <p>Verifica in corso...</p>
    </div>
  </div> -->

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

    <template #submit>
      <UButton
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
