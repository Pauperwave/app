// server\utils\telegram\deepLinks.ts
import type { Context } from 'grammy'

// Telegram turns t.me/<bot>?start=<payload> into an ordinary "/start
// <payload>" message, so ctx.match on the 'start' command already *is* the
// payload — no separate deep-link parsing needed, just a lookup here.
// Payloads are restricted by Telegram to [A-Za-z0-9_], so a plain command
// name (e.g. 'calendario') doubles as its own payload.
const deepLinkHandlers = new Map<string, (ctx: Context) => Promise<unknown>>()

// Call this from a register*Command alongside commands.command(), passing
// the exact same handler — reuses it verbatim instead of duplicating what
// the command already does.
export function registerDeepLink(payload: string, handler: (ctx: Context) => Promise<unknown>) {
  deepLinkHandlers.set(payload, handler)
}

export function resolveDeepLink(payload: string): ((ctx: Context) => Promise<unknown>) | undefined {
  return deepLinkHandlers.get(payload)
}
