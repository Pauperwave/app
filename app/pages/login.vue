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

// const toast = useToast()

// const fields = [{
//   name: 'email',
//   type: 'text' as const,
//   label: 'Email',
//   placeholder: 'Enter your email',
//   required: true
// }, {
//   name: 'password',
//   label: 'Password',
//   type: 'password' as const,
//   placeholder: 'Enter your password'
// }, {
//   name: 'remember',
//   label: 'Remember me',
//   type: 'checkbox' as const
// }]
const fields = [{
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  icon: 'i-lucide-at-sign',
  placeholder: 'Inserisci la tua email',
  required: true
}]

// TODO correggere email
const schema = z.object({
  email: z.string().check(z.trim(), z.email({ message: 'Please enter a valid email address.' }), z.toLowerCase())
})

type Schema = z.output<typeof schema>

const supabase = useSupabaseClient()
const email = ref('')

const signInWithOtp = async (payload: FormSubmitEvent<Schema>) => {
  console.log('Submitted', payload)

  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      // set this to false if you do not want the user to be automatically signed up
      shouldCreateUser: false,
      emailRedirectTo: 'http://localhost:3000/'
    }
  })
  if (error) console.log(error)
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    title="Bentornato"
    icon="i-lucide-lock"
    @submit="signInWithOtp"
  >
    <template #description>
      Non hai un account? <ULink
        to="/signup"
        class="text-primary font-medium"
      >Registrati</ULink>.
    </template>

    <template #password-hint>
      <ULink
        to="/"
        class="text-primary font-medium"
        tabindex="-1"
      >Forgot password?</ULink>
    </template>

    <template #footer>
      Accedendo, accetti i nostri <ULink
        to="/"
        class="text-primary font-medium"
      >Termini di servizio</ULink>.
    </template>

    <template #submit>
      <UButton
        type="submit"
        color="primary"
        icon="i-lucide-log-in"
        size="lg"
        block
      >
        Accedi
      </UButton>
    </template>
  </UAuthForm>
</template>
