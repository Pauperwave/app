// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

// Visual debugging: `pnpm test:e2e:headed` (PW_SLOWMO=1 under the hood, via
// cross-env for Windows/PowerShell) runs headed with a 2s delay between
// actions, so you can actually watch the browser instead of it running
// headless/instant. Off by default — `pnpm test:e2e` stays fast.
const slowMode = !!process.env.PW_SLOWMO

// Plain @playwright/test config, NOT @nuxt/test-utils/playwright's `nuxt`
// fixture, same convention as MagicTheGathering/league — that fixture builds
// and manages its own separate Nuxt instance, which conflicts with the
// `webServer` below. `webServer` is simpler and sufficient for this suite.
//
// No `projects`/auth-setup dependency yet: this app's login is Supabase
// magic-link (OTP email), which can't be scripted the same way league's
// password-based auth-utils session is. Add a `setup` project + stored
// storageState once there's a way to bypass/stub the OTP step for e2e.
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    headless: !slowMode,
    launchOptions: slowMode ? { slowMo: 2000 } : {},
    // The app has no hardcoded default — it follows the browser's
    // prefers-color-scheme (Nuxt UI's color-mode default is 'system').
    // Playwright's own browser context defaults to 'light' regardless of the
    // host OS's actual theme, so headed runs looked light even on a
    // dark-themed machine. Pin it to dark to match how this app is actually
    // used/screenshotted day to day.
    colorScheme: 'dark'
  },
  // Runs the production build, not `pnpm dev` (same rationale as league: the
  // dev server has shown dev-only quirks not present in the built server).
  // `pnpm build` runs once before `webServer` starts it.
  webServer: {
    command: 'pnpm build && node .output/server/index.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
