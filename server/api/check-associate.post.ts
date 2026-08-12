// server\api\check-associate.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string }>(event)
  const config = useRuntimeConfig(event)

  const client = createClient(
    config.public.supabase.url,
    config.supabase.secretKey
  )

  const { data, error } = await client
    .from('pauperwave_associates')
    .select('email_address')
    .eq('email_address', body.email)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { exists: !!data }
})
