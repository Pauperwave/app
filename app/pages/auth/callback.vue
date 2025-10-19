<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const router = useRouter()
const toast = useToast()

onMounted(async () => {
  const { error } = await supabase.auth.exchangeCodeForSession(
    window.location.hash
  )

  if (error) {
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
