// server\utils\telegram\menuNav.ts
import type { Context } from 'grammy'
import type { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

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

// A back target's content is either a plain FormattedString (text+entities)
// or Rich Message markdown — origins that have been converted to
// sendRichMessage (see tournament/detail.ts's 'p' branch) hand back the
// latter, everyone else still hands back the former.
export interface MenuNavTarget {
  payload: string
  menu: Menu<Context>
  text: FormattedString | { markdown: string }
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
  const { text } = target

  if (ctx.callbackQuery?.message && 'photo' in ctx.callbackQuery.message) {
    await ctx.deleteMessage().catch(() => {})
    if (text instanceof FormattedString) {
      await ctx.reply(text.text, { entities: text.entities, reply_markup: target.menu })
    } else {
      await ctx.replyWithRichMessage(text, { reply_markup: target.menu })
    }
  } else if (text instanceof FormattedString) {
    await ctx.editMessageText(text.text, {
      entities: text.entities,
      reply_markup: target.menu,
      link_preview_options: { is_disabled: true }
    })
  } else {
    await ctx.editMessageText(text, { reply_markup: target.menu })
  }
}
