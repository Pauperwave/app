// server\utils\telegram\menuNav.ts
import type { Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { Menu } from '@grammyjs/menu'

// Named-menu registry: lets a shared detail menu's "back" button find a list menu by id without
// importing it, breaking the circular dependency (calendario.ts needs torneoMenu to go forward,
// torneoMenu needs calendario.ts to go back). Not generic over Context flavors: every menu here
// uses plain grammy Context.
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
  // Markdown or blocks: both are InputRichMessage shapes on the same interface, so navigateBack
  // needn't branch
  text: InputRichMessage
}

// Same registry pattern for the other half of detail.ts's "back" button: rebuilding the origin view
// needs each list command's block-rendering function, and importing them from detail.ts created
// import cycles (calendario/leghe/iscrizioni/prossimo import torneoMenu from it). Each list command
// registers a resolver keyed by the origin prefix ('m'/'l'/'i'/'p') in torneoMenu's payload;
// detail.ts only depends on this registry.
export type BackTargetResolver = (
  ctx: Context, origin: string, chatId: number
) => Promise<MenuNavTarget>

const backResolverRegistry = new Map<string, BackTargetResolver>()

export function registerBackResolver(prefix: string, resolver: BackTargetResolver) {
  backResolverRegistry.set(prefix, resolver)
}

export function getBackResolver(prefix: string): BackTargetResolver {
  const resolver = backResolverRegistry.get(prefix)
  if (!resolver) throw new Error(`Back resolver '${prefix}' was not registered via registerBackResolver()`)
  return resolver
}

// Shared "go back to an origin view with full state restored": swap ctx.match to the target's
// payload, edit in place or delete+resend depending on whether the message is a photo, return the
// right menu. Only which target to resolve differs per caller (resolveTarget).
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
