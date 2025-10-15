import type { Associate } from '~/types/associate'

export const useAssociates = () => {
  const supabase = useSupabaseClient()
  const associates = ref<Associate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchAssociates = async () => {
    loading.value = true
    const { data, error: supabaseError } = await supabase
      .from('pauperwave_associates')
      .select('*')
      .order('created_at', { ascending: false })

    if (supabaseError) error.value = supabaseError.message
    else associates.value = data ?? []

    loading.value = false
  }

  return { associates, fetchAssociates, loading, error }
}
