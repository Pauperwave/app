import type { Associate } from '~/types'

export const useAssociates = () => {
  const supabase = useSupabaseClient()

  const { data: associates, pending: loading, error, refresh } = useAsyncData(
    'associates',
    async () => {
      const { data, error: supabaseError } = await supabase
        .from('pauperwave_associates_with_status')
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
      // membership_request_status/membership_status sono testo libero a DB
      // (non enum Postgres), ma l'app tratta solo i valori noti definiti nei tipi
      return (data ?? []) as Associate[]
    },
    {
      default: () => [],
      lazy: true
    }
  )

  return { associates, loading, error, refresh }
}
