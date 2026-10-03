// server\utils\telegram\perContextCache.ts
import type { Context } from 'grammy'

// A command's handler and its Menu.dynamic() re-render run in the same webhook update and share one
// `ctx` (.dynamic() re-runs on every render, including the one grammY triggers after a reply with a
// reply_markup). Caching a fetch by ctx (garbage-collected after the update) dedupes what would
// otherwise run twice.
interface PerContextCache<T extends Record<string, unknown>> {
  <K extends keyof T>(ctx: Context, key: K, fetch: () => T[K]): T[K]
  // Overwrites an already-memoized value for this ctx, for a mutation invalidating something cached
  // earlier in the update: grammY re-runs .dynamic() BEFORE the pressed button's handler, which can
  // memoize a pre-mutation value that a later ctx.menu.update() would reuse stale (see detail.ts's
  // handleRegister/handleCancelRegistration)
  set<K extends keyof T>(ctx: Context, key: K, value: T[K]): void
}

export function createPerContextCache<T extends Record<string, unknown>>(): PerContextCache<T> {
  const store = new WeakMap<Context, Partial<T>>()

  function getCache(ctx: Context): Partial<T> {
    let cache = store.get(ctx)
    if (!cache) {
      cache = {}
      store.set(ctx, cache)
    }
    return cache
  }

  const memoize = ((ctx, key, fetch) => {
    const cache = getCache(ctx)
    return (cache[key] ??= fetch())
  }) as PerContextCache<T>

  memoize.set = (ctx, key, value) => {
    getCache(ctx)[key] = value
  }

  return memoize
}
