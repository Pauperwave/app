# test/e2e

Playwright specs go here (`pnpm test:e2e`). No specs exist yet — `playwright.config.ts` has no auth-setup project because this app's login is Supabase magic-link (OTP email); scripting that for e2e still needs a bypass/stub strategy before login-gated flows can be tested.
