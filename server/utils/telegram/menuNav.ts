// server\utils\telegram\menuNav.ts
import type { Context } from 'grammy'
import type { Menu } from '@grammyjs/menu'
import type { FormattedString } from '@grammyjs/parse-mode'

// Tiny named-menu registry — lets a shared detail menu's "back" button look
// up whichever list-menu instance a domain module registered under a given
// id, without importing that module's own Menu object directly at the top
// level. Needed because these detail<->list relationships are naturally
// circular (calendario.ts needs torneoMenu to open a detail view forward;
// torneoMenu needs calendario.ts's own menu+text to go back) — using a
// registry instead of a direct import breaks the cycle, since registration
// happens inside each register*Command() call (after every module has
// already finished evaluating), not at module top-level.
//
// Not generic over Context flavors (unlike Menu<C> itself) — every menu in
// this bot uses plain grammy Context, no custom flavor, so a generic here
// would only add variance headaches (Menu<C>'s own fingerprint option makes
// it invariant-ish) for a capability nothing actually needs.
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
  text: FormattedString
}

// Shared "go back to an origin view with full state restored" execution —
// every domain with a detail view reachable from more than one list
// (tournament detail today, wanted-card detail next) needs the same three
// steps: swap ctx.match to the target's own payload format so its own
// .dynamic() renders correctly, pick edit-in-place vs delete+resend
// depending on whether the current message is a photo, and hand back the
// right menu as reply_markup. Only *which* target to resolve differs per
// domain — that's resolveTarget, supplied by the caller.
export async function navigateBack(
  ctx: Context & { match?: string }, resolveTarget: () => Promise<MenuNavTarget>
) {
  const target = await resolveTarget()
  ctx.match = target.payload

  if (ctx.callbackQuery?.message && 'photo' in ctx.callbackQuery.message) {
    await ctx.deleteMessage().catch(() => {})
    await ctx.reply(target.text.text, { entities: target.text.entities, reply_markup: target.menu })
  } else {
    await ctx.editMessageText(target.text.text, {
      entities: target.text.entities,
      reply_markup: target.menu,
      link_preview_options: { is_disabled: true }
    })
  }
}
