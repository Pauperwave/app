// server\utils\telegram\menuNav.ts
import type { Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { Menu } from '@grammyjs/menu'

// Named-menu registry — lets a shared detail menu's "back" button look up a
// list-menu instance by id without importing it directly, breaking the
// natural circular dependency (calendario.ts needs torneoMenu to go
// forward; torneoMenu needs calendario.ts's menu+text to go back).
//
// Not generic over Context flavors — every menu in this bot uses plain
// grammy Context, so a generic here would only add variance headaches.
const menuRegistry = new Map<string, Menu<Context>>()

export function registerMenu(id: string, menu: Menu<Context>) {
  menuRegistry.set(id, menu)
}

export function getMenu(id: string): Menu<Context> {
  const menu = menuRegistry.get(id)
  if (!menu) throw new Error(`Menu '${id}' was not registered via registerMenu()`)
  return menu
}

export interface MenuNavTarget {
  payload: string
  menu: Menu<Context>
  // markdown or blocks — both are valid InputRichMessage shapes on the same
  // interface (not a discriminated union), so callers can hand back either
  // without navigateBack needing to branch on which one it got.
  text: InputRichMessage
}

// Shared "go back to an origin view with full state restored": swap
// ctx.match to the target's payload, pick edit-in-place vs delete+resend
// depending on whether the message is a photo, hand back the right menu.
// Only *which* target to resolve differs per caller (resolveTarget).
export async function navigateBack(
  ctx: Context & { match?: string }, resolveTarget: () => Promise<MenuNavTarget>
) {
  const target = await resolveTarget()
  ctx.match = target.payload

  if (ctx.callbackQuery?.message && 'photo' in ctx.callbackQuery.message) {
    await ctx.deleteMessage().catch(() => {})
    await ctx.replyWithRichMessage(target.text, { reply_markup: target.menu })
  } else {
    await ctx.editMessageText(target.text, { reply_markup: target.menu })
  }
}
