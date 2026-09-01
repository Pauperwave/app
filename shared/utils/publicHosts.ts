// shared\utils\publicHosts.ts
// Single source of truth for the subdomains that back public, unauthenticated
// sections of the app (ADR-011, docs/PROGRESS.md). Each maps to an absolute
// URL on app.pauperwave.org — server/middleware/public-host.ts sends a real
// cross-domain redirect, not a same-URL rewrite (an in-place rewrite doesn't
// survive h3/Nitro's request dispatcher; confirmed 2026-08-13, see that
// file's history for details).
export const HOST_ROUTE_MAP: Record<string, string> = {
  'cittadino.pauperwave.org': 'https://app.pauperwave.org/classifiche/cittadino',
  'commander.pauperwave.org': 'https://app.pauperwave.org/classifiche/commander',
  'premodern.pauperwave.org': 'https://app.pauperwave.org/classifiche/premodern',
  'pauper.pauperwave.org': 'https://app.pauperwave.org/classifiche/pauper',
  'tesseramento.pauperwave.org': 'https://app.pauperwave.org/tesseramento',
  // Distinct from the internal /events dashboard route (auth-only,
  // UDashboardPanel shell) — same reasoning as /classifiche/<format> above vs.
  // /standings/<format> (dashboard-only). Not /calendar either: that's an
  // unrelated in-development dashboard page (pages/calendar/index.vue) —
  // distinct word ("calendario" vs "calendar"), no collision. Renamed from
  // eventi./ /eventi 2026-08-14 at the user's request.
  'calendario.pauperwave.org': 'https://app.pauperwave.org/calendario'
}

export const PUBLIC_HOSTS = Object.keys(HOST_ROUTE_MAP)
