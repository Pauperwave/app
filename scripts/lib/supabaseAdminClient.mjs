// scripts\lib\supabaseAdminClient.mjs
// Shared by every one-off scripts/*.mjs job: same env-var check and
// service-role Supabase client every script needs (see .env).
import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SECRET_KEY = process.env.NUXT_SUPABASE_SECRET_KEY

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('Missing NUXT_PUBLIC_SUPABASE_URL / NUXT_SUPABASE_SECRET_KEY in the environment (see .env).')
    process.exit(1)
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
