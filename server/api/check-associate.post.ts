// server\api\check-associate.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string }>(event)
  const config = useRuntimeConfig(event)

  const client = createClient(
    config.public.supabase.url,
    config.supabase.secretKey
  )

  // Only an approved application may receive a magic link: a 'pending' or 'rejected' /tesseramento
  // submission already has a row here (public_apply RLS inserts it as 'pending')
  const { data, error } = await client
    .from('pauperwave_associates')
    .select('email_address')
    .eq('email_address', body.email)
    .eq('membership_request_status', 'approved')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { exists: !!data }
})
