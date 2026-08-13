// shared\utils\publicHosts.ts
// Single source of truth for the subdomains that vercel.json rewrites to
// public, unauthenticated sections of the app (ADR-011, docs/PROGRESS.md).
// Keep in sync with vercel.json's rewrite `has.value` entries.
export const PUBLIC_HOSTS = [
  'cittadino.pauperwave.org',
  'commander.pauperwave.org',
  'premodern.pauperwave.org',
  'pauper.pauperwave.org',
  'tesseramento.pauperwave.org',
  'eventi.pauperwave.org'
] as const
