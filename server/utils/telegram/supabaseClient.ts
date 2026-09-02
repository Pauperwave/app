// server\utils\telegram\supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Telegram commands run outside any single HTTP request (the bot instance
// is a long-lived singleton, see bot.ts) — no H3Event to pass to
// serverSupabaseServiceRole. Same anon-client pattern as
// server/api/dev/test-login.post.ts's anonClient: everything read through
// this client is public data anyway (same rows /calendario, /classifiche
// show to anonymous visitors), so the anon key is the right key here, not
// the service-role secret.
export function publicSupabaseClient() {
  const config = useRuntimeConfig()
  return createClient<Database>(config.public.supabase.url, config.public.supabase.key)
}
