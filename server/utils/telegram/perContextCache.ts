// server\utils\telegram\perContextCache.ts
import type { Context } from 'grammy'

// A command's handler and its own Menu.dynamic() re-render both run within
// the same webhook update, sharing the same `ctx` reference (`.dynamic()`
// re-runs on every render, including the one grammY triggers right after a
// reply/editMessageText with a `reply_markup` to build the buttons) —
// caching a fetch by ctx (garbage-collected once the update finishes)
// dedupes a query/request that would otherwise run twice per update.
// Generalized out of tournament/detail.ts's original hand-rolled WeakMap.
export function createPerContextCache<T extends Record<string, unknown>>() {
  const store = new WeakMap<Context, Partial<T>>()

  function getCache(ctx: Context): Partial<T> {
    let cache = store.get(ctx)
    if (!cache) {
      cache = {}
      store.set(ctx, cache)
    }
    return cache
  }

  return function memoize<K extends keyof T>(ctx: Context, key: K, fetch: () => T[K]): T[K] {
    const cache = getCache(ctx)
    return cache[key] ??= fetch()
  }
}
