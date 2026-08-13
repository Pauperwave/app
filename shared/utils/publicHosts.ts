// shared\utils\publicHosts.ts
// Single source of truth for the subdomains that back public, unauthenticated
// sections of the app (ADR-011, docs/PROGRESS.md). vercel.json's host-based
// rewrites to these same destinations are dead — Nitro's `vercel` preset
// generates its own unconditional catch-all route in the deployment's Build
// Output config, which Vercel matches before ever consulting vercel.json's
// Host-conditioned rules. server/middleware/public-host.ts replicates the
// mapping in-app instead, as a real redirect rather than a same-URL rewrite
// — an in-place rewrite (mutating event.node.req.url) doesn't survive h3's
// own request dispatcher, which resets the path back to its original value
// before every middleware/handler layer (confirmed 2026-08-13: a rewrite-based
// version of public-host.ts left cittadino.pauperwave.org/ rendering the
// dashboard home page instead of /rankings/cittadino). Keep this map and
// vercel.json's `destination` values in sync regardless, since vercel.json is
// left in place as a harmless, self-documenting record of intent.
export const HOST_ROUTE_MAP: Record<string, string> = {
  'cittadino.pauperwave.org': '/rankings/cittadino',
  'commander.pauperwave.org': '/rankings/commander',
  'premodern.pauperwave.org': '/rankings/premodern',
  'pauper.pauperwave.org': '/rankings/pauper',
  'tesseramento.pauperwave.org': '/tesseramento',
  // Distinct from the internal /events dashboard route (auth-only,
  // UDashboardPanel shell) — same reasoning as /rankings/<format> above vs.
  // /standings/<format> (dashboard-only). Not /calendar either: that's an
  // unrelated in-development dashboard page (pages/calendar/index.vue).
  'eventi.pauperwave.org': '/eventi'
}

export const PUBLIC_HOSTS = Object.keys(HOST_ROUTE_MAP)
