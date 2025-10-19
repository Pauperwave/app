// server/api/check-associate.post.ts
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string }>(event)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('pauperwave_associates')
    .select('email_address')
    .eq('email_address', body.email)
    .single()

  if (error && error.code !== 'PGRST116') {
    // Errore diverso da "no rows found"
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { exists: !!data }
})
