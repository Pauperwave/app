// server\utils\telegram\supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

import type { Database } from '#shared/utils/types/database'

// Telegram commands run outside any HTTP request (the bot is a long-lived singleton, see bot.ts),
// so there is no H3Event for serverSupabaseServiceRole. Same anon-client pattern as
// test-login.post.ts: everything read here is public data (what /calendario and /classifiche show
// anonymous visitors), so the anon key is right.
export function publicSupabaseClient() {
  const config = useRuntimeConfig()
  return createClient<Database>(config.public.supabase.url, config.public.supabase.key)
}

// Service-role variant for bot operations on tables with no anon-safe RLS policy
// (pauperwave_associates by email, pauperwave_associate_telegram_links: service-role only, see
// migration 20260902065723). Use the anon variant by default; reach for this only when RLS requires
// it.
export function telegramServiceSupabaseClient() {
  const config = useRuntimeConfig()
  return createClient<Database>(config.public.supabase.url, config.supabase.secretKey)
}
