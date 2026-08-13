// server\middleware\public-host.ts
import { HOST_ROUTE_MAP } from '#shared/utils/publicHosts'

// vercel.json's host-based rewrites never reach Nuxt on this deployment (see
// shared/utils/publicHosts.ts) — replicate the host -> internal path mapping
// here instead, before Nuxt's router resolves the request, so both SSR and
// the isPublicHost flag (read by app/middleware/auth.global.ts) see the
// correct rewritten path.
export default defineEventHandler((event) => {
  const host = getHeader(event, 'host')?.toLowerCase()
  const base = host ? HOST_ROUTE_MAP[host] : undefined
  event.context.isPublicHost = Boolean(base)
  if (!base) return

  const url = event.node.req.url ?? '/'
  const [path = '/', search] = url.split('?')
  if (path === base || path.startsWith(`${base}/`)) return // already-rewritten or a direct link

  event.node.req.url = base + (path === '/' ? '' : path) + (search ? `?${search}` : '')
})
