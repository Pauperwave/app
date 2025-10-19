<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const toast = useToast()
const supabase = useSupabaseClient()

onMounted(async () => {
  // Get the hash fragment (everything after #)
  const hashParams = window.location.hash.substring(1)
  console.log('Callback page loaded with hash:', hashParams)

  if (!hashParams) {
    toast.add({
      title: 'Errore',
      description: 'Nessun codice di autenticazione trovato',
      color: 'error'
    })
    await router.push('/login')
    return
  }

  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(hashParams)

  if (error) {
    console.error('Auth error:', error)
    toast.add({
      title: 'Errore',
      description: 'Link non valido o scaduto',
      color: 'error'
    })
    await router.push('/login')
  } else {
    toast.add({
      title: 'Successo',
      description: 'Accesso effettuato!',
      color: 'success'
    })
    await router.push('/')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 mb-4" />
      <p>Verifica in corso...</p>
    </div>
  </div>
</template>
