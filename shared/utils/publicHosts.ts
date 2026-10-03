// shared\utils\publicHosts.ts
// Single source of truth for the subdomains backing public sections of the app (ADR-011,
// docs/PROGRESS.md). Each maps to an absolute URL on app.pauperwave.org:
// server/middleware/public-host.ts redirects cross-domain, since an in-place rewrite doesn't
// survive h3/Nitro's request dispatcher.
export const HOST_ROUTE_MAP: Record<string, string> = {
  'cittadino.pauperwave.org': 'https://app.pauperwave.org/classifiche/cittadino',
  'commander.pauperwave.org': 'https://app.pauperwave.org/classifiche/commander',
  'premodern.pauperwave.org': 'https://app.pauperwave.org/classifiche/premodern',
  'pauper.pauperwave.org': 'https://app.pauperwave.org/classifiche/pauper',
  'tesseramento.pauperwave.org': 'https://app.pauperwave.org/tesseramento',
  // Distinct from the auth-only /events dashboard route (like /classifiche/<format> vs
  // /standings/<format>) and from the unrelated /calendar dashboard page
  'calendario.pauperwave.org': 'https://app.pauperwave.org/calendario'
}

export const PUBLIC_HOSTS = Object.keys(HOST_ROUTE_MAP)
