// shared\utils\publicHosts.ts
// Single source of truth for the subdomains that back public, unauthenticated
// sections of the app (ADR-011, docs/PROGRESS.md). vercel.json's host-based
// rewrites to these same destinations are dead — Nitro's `vercel` preset
// generates its own unconditional catch-all route in the deployment's Build
// Output config, which Vercel matches before ever consulting vercel.json's
// Host-conditioned rules (confirmed 2026-08-13: the SSR payload's `path` for
// a fresh cittadino.pauperwave.org/ request is "/", not "/rankings/cittadino").
// server/middleware/public-host.ts replicates the mapping in-app instead,
// where execution order is guaranteed. Keep this map and vercel.json's
// `destination` values in sync regardless, since vercel.json is left in
// place as a harmless, self-documenting record of intent.
export const HOST_ROUTE_MAP: Record<string, string> = {
  'cittadino.pauperwave.org': '/rankings/cittadino',
  'commander.pauperwave.org': '/rankings/commander',
  'premodern.pauperwave.org': '/rankings/premodern',
  'pauper.pauperwave.org': '/rankings/pauper',
  'tesseramento.pauperwave.org': '/tesseramento',
  'eventi.pauperwave.org': '/events'
}

export const PUBLIC_HOSTS = Object.keys(HOST_ROUTE_MAP)
