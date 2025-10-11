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
  placeholder: 'Enter your email',
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

  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: 'http://localhost:3000/confirm'
    }
  })
  if (error) console.log(error)
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    title="Welcome back"
    icon="i-lucide-lock"
    @submit="signInWithOtp"
  >
    <!-- <template #description>
      Don't have an account? <ULink
        to="/signup"
        class="text-primary font-medium"
      >Sign up</ULink>.
    </template> -->

    <template #password-hint>
      <ULink
        to="/"
        class="text-primary font-medium"
        tabindex="-1"
      >Forgot password?</ULink>
    </template>

    <!-- <template #footer>
      By signing in, you agree to our <ULink
        to="/"
        class="text-primary font-medium"
      >Terms of Service</ULink>.
    </template> -->
  </UAuthForm>
</template>
