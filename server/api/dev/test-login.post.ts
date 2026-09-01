// server\api\dev\test-login.post.ts
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseServiceRole } from '#supabase/server'

// Dev-only: mints a real Supabase session for a designated test associate,
// so browser automation (claude-in-chrome) can reach authenticated routes
// without a real magic-link email round trip. 404s outside dev — `import.
// meta.dev` is compiled away in a production build, so this whole handler
// (and its service-role usage) doesn't ship. Requires DEV_TEST_ASSOCIATE_EMAIL
// in .env (git-ignored, local only) — an existing approved associate to sign
// in as. Uses the same generateLink + verifyOtp round trip Supabase itself
// does for a magic link, just without sending the email.
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const testEmail = process.env.DEV_TEST_ASSOCIATE_EMAIL
  if (!testEmail) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Set DEV_TEST_ASSOCIATE_EMAIL in .env to an existing approved associate\'s email.'
    })
  }

  const admin = serverSupabaseServiceRole(event)

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: testEmail
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    throw createError({
      statusCode: 500,
      statusMessage: linkError?.message ?? 'Failed to generate a login link for DEV_TEST_ASSOCIATE_EMAIL.'
    })
  }

  const config = useRuntimeConfig(event)
  // A plain anon client, not the service-role one above — verifyOtp is a
  // regular auth operation and must run as the anon role to get back a real
  // user session (the service-role client above has persistSession/
  // autoRefreshToken disabled and isn't meant to hold a user session at all).
  const anonClient = createClient(config.public.supabase.url, config.public.supabase.key)

  const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
    type: 'email',
    token_hash: linkData.properties.hashed_token
  })

  if (verifyError || !verifyData.session) {
    throw createError({
      statusCode: 500,
      statusMessage: verifyError?.message ?? 'Failed to verify the generated login link.'
    })
  }

  return {
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token
  }
})
