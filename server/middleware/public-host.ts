// server\middleware\public-host.ts
import { HOST_ROUTE_MAP } from '#shared/utils/publicHosts'

// A same-URL rewrite (mutating event.node.req.url so the browser keeps
// showing e.g. cittadino.pauperwave.org/ while a different page renders)
// turned out not to work with this h3/Nitro version: h3's own dispatcher
// (createAppEventHandler in node_modules/h3/dist/index.mjs) captures the
// request path once, in a closure variable, before the middleware stack
// runs, and resets event._path/event.node.req.url back to that original
// value before *every* layer — including Nuxt's own render handler. Any
// mutation a middleware makes to the path is silently discarded before the
// next layer runs; only event.context survives across layers. Confirmed
// 2026-08-13 in production: cittadino.pauperwave.org/ rendered the
// dashboard home page (dashboard-panel-home), not /rankings/cittadino,
// even though an earlier isPublicHost-on-context version of this file
// correctly skipped the login redirect (context alone works, path
// mutation doesn't).
//
// A real redirect sidesteps the problem entirely: the browser makes a
// fresh request for the target path, which auth.global.ts's publicPrefixes
// already recognizes as public without needing any Host-based flag.
export default defineEventHandler((event) => {
  const host = getHeader(event, 'host')?.toLowerCase()
  const base = host ? HOST_ROUTE_MAP[host] : undefined
  if (!base) return

  const path = event.path.split('?')[0] ?? '/'
  if (path === base || path.startsWith(`${base}/`)) return // already at the target path

  return sendRedirect(event, base, 302)
})
