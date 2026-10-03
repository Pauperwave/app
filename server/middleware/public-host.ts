// server\middleware\public-host.ts
import { HOST_ROUTE_MAP } from '#shared/utils/publicHosts'

// Public subdomains redirect cross-domain instead of rewriting the URL in place: h3's dispatcher
// resets event._path/event.node.req.url to the original request path before every layer (Nuxt's
// render handler included), so a middleware's path rewrite is silently discarded; only
// event.context survives. A real redirect makes the browser request the target, which
// auth.global.ts's publicPrefixes already treats as public. The target (app.pauperwave.org) isn't
// in HOST_ROUTE_MAP, so it can't re-enter this middleware.
export default defineEventHandler((event) => {
  const host = getHeader(event, 'host')?.toLowerCase()
  const target = host ? HOST_ROUTE_MAP[host] : undefined
  if (!target) return

  return sendRedirect(event, target, 302)
})
