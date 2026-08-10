// app\composables\associates\useAssociates.ts
import type { Associate } from '~/types'

export const useAssociates = () => {
  const supabase = useSupabaseClient()

  const {
    data: associates, pending: loading, error, refresh
  } = useAsyncData(
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

      // membership_request_status/membership_status are free text in the DB (not
      // Postgres enums), but the app only handles the known values from the types
      return (data ?? []) as Associate[]
    },
    {
      default: () => [],
      lazy: true
    }
  )

  return { associates, loading, error, refresh }
}
