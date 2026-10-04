// server\utils\telegram\deepLinks.ts
import type { Context } from 'grammy'

// Telegram turns t.me/<bot>?start=<payload> into a "/start <payload>" message, so ctx.match on
// 'start' already is the payload. Payloads are limited to [A-Za-z0-9_-], so a plain command name
// doubles as its payload.
const deepLinkHandlers = new Map<string, (ctx: Context) => Promise<unknown>>()

// Call from a register*Command next to commands.command(), passing the same handler to reuse it
// verbatim
export function registerDeepLink(payload: string, handler: (ctx: Context) => Promise<unknown>) {
  deepLinkHandlers.set(payload, handler)
}

// For a link that carries an argument after a fixed prefix (`torneo_<uuid>`): the handler gets
// what follows the prefix. An exact payload registered with registerDeepLink wins.
const prefixHandlers = new Map<string, (ctx: Context, argument: string) => Promise<unknown>>()

export function registerDeepLinkPrefix(
  prefix: string,
  handler: (ctx: Context, argument: string) => Promise<unknown>
) {
  prefixHandlers.set(prefix, handler)
}

export function resolveDeepLink(payload: string): ((ctx: Context) => Promise<unknown>) | undefined {
  const exact = deepLinkHandlers.get(payload)
  if (exact) return exact

  for (const [prefix, handler] of prefixHandlers) {
    if (payload.startsWith(prefix)) {
      const argument = payload.slice(prefix.length)
      return ctx => handler(ctx, argument)
    }
  }
  return undefined
}
