export const useAssociates = () => {
  const supabase = useSupabaseClient()

  const { data: associates, pending: loading, error, refresh } = useAsyncData(
    'associates',
    async () => {
      const { data, error: supabaseError } = await supabase
        .from('pauperwave_associates')
        .select('*')
        .order('id', { ascending: true })

      if (supabaseError) {
        throw createError({
          statusCode: 500,
          message: supabaseError.message
        })
      }

      if (import.meta.env.DEV) {
        console.log('Fetched associates:', data)
      }
      return data ?? []
    },
    {
      default: () => [],
      lazy: true
    }
  )

  return { associates, loading, error, refresh }
}
