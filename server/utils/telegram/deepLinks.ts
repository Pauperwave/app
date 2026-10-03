// server\utils\telegram\deepLinks.ts
import type { Context } from 'grammy'

// Telegram turns t.me/<bot>?start=<payload> into a "/start <payload>" message, so ctx.match on
// 'start' already is the payload. Payloads are limited to [A-Za-z0-9_], so a plain command name
// doubles as its payload.
const deepLinkHandlers = new Map<string, (ctx: Context) => Promise<unknown>>()

// Call from a register*Command next to commands.command(), passing the same handler to reuse it
// verbatim
export function registerDeepLink(payload: string, handler: (ctx: Context) => Promise<unknown>) {
  deepLinkHandlers.set(payload, handler)
}

export function resolveDeepLink(payload: string): ((ctx: Context) => Promise<unknown>) | undefined {
  return deepLinkHandlers.get(payload)
}
