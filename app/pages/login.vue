<script setup lang="ts">
definePageMeta({
  layout: 'login'
})

const supabase = useSupabaseClient()
const email = ref('')

const signInWithOtp = async () => {
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
  <div>
    <button @click="signInWithOtp">
      Sign In with E-Mail
    </button>
    <USeparator label="or any text" />
    <UInput
      v-model="email"
      type="email"
      class="border-white border-2"
    />
  </div>
</template>
