// server\utils\telegram\perContextCache.ts
import type { Context } from 'grammy'

// A command's handler and its own Menu.dynamic() re-render both run within
// the same webhook update, sharing the same `ctx` reference (`.dynamic()`
// re-runs on every render, including the one grammY triggers right after a
// reply/editMessageText with a `reply_markup` to build the buttons) —
// caching a fetch by ctx (garbage-collected once the update finishes)
// dedupes a query/request that would otherwise run twice per update.
// Generalized out of tournament/detail.ts's original hand-rolled WeakMap.
interface PerContextCache<T extends Record<string, unknown>> {
  <K extends keyof T>(ctx: Context, key: K, fetch: () => T[K]): T[K]
  // Overwrites an already-memoized value for this ctx — for a mutation
  // that invalidates a value cached earlier in the same update (grammY's
  // own button-press matching re-runs .dynamic() *before* calling the
  // pressed button's handler, which can memoize a pre-mutation value that
  // a later ctx.menu.update() would otherwise reuse stale). See
  // tournament/detail.ts's handleRegister/handleCancelRegistration for the
  // concrete case this was added for (confirmed 2026-09-11 — the
  // Iscriviti/Annulla button wasn't flipping after a successful action).
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
