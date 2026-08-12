// app\composables\useLogout.ts

// Shared by UserMenu.vue and the command palette's "Sign out" action —
// extracted once a 2nd caller needed the exact same toast/redirect flow.
export function useLogout() {
  const supabase = useSupabaseClient()
  const toast = useToast()
  const { t } = useI18n()

  return async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast.add({
          title: t('userMenu.logoutErrorTitle'),
          description: t('userMenu.logoutErrorDescription'),
          color: 'error'
        })
      } else {
        toast.add({
          title: t('userMenu.logoutSuccessTitle'),
          description: t('userMenu.logoutSuccessDescription'),
          color: 'success'
        })
        navigateTo('/login')
      }
    } catch (err) {
      console.error('Logout error:', err)
      toast.add({
        title: t('userMenu.logoutErrorTitle'),
        description: t('userMenu.genericErrorDescription'),
        color: 'error'
      })
    }
  }
}
