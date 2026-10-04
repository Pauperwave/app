// server\utils\telegram\commands\account\collegamento.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { resolveAssociateUuidByChatId } from './linking'
import { registerDeepLink } from '../../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

interface AssociateIdentity {
  first_name: string | null
  last_name: string | null
  email_address: string | null
}

async function fetchAssociateIdentity(associateUuid: string): Promise<AssociateIdentity | null> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .select('first_name, last_name, email_address')
    .eq('uuid', associateUuid)
    .maybeSingle()

  if (error) throw error
  return data
}

// Read-only check of "is this chat linked, and to whom", distinct from linking (linking.ts's email
// flow, via /start). Extracted for reuse by t.me/<bot>?start=collegamento (deepLinks.ts)
async function collegamentoCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return

  try {
    const associateUuid = await resolveAssociateUuidByChatId(ctx.chat.id)
    if (!associateUuid) {
      await ctx.replyWithRichMessage({
        markdown: `${ICONS.failure} Questa chat non è collegata a nessun socio.\n\n`
          + 'Scrivimi la tua email da socio per collegarla.\n\n'
          + 'Se non ti ricordi l\'email puoi scrivere a /supporto.'
      })
      return
    }

    const identity = await fetchAssociateIdentity(associateUuid)
    const name = identity ? `${identity.first_name ?? ''} ${identity.last_name ?? ''}`.trim() : null
    const email = identity?.email_address

    const lines = [`${ICONS.success} Questa chat è collegata${name ? ` a ${name}` : ''}.`]
    if (email) lines.push(email)
    // \n\n, not \n: see core.ts on Rich Message markdown
    await ctx.replyWithRichMessage({ markdown: lines.join('\n\n') })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a verificare il collegamento, riprova più tardi.`
    })
  }
}

registerDeepLink('collegamento', collegamentoCommandHandler)

// Opposite of /collegamento: removes this chat's row from pauperwave_associate_telegram_links (the
// table linkChat() upserts into). Extracted for reuse by t.me/<bot>?start=scollegamento
// (deepLinks.ts)
async function scollegamentoCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return

  try {
    const associateUuid = await resolveAssociateUuidByChatId(ctx.chat.id)
    if (!associateUuid) {
      await ctx.replyWithRichMessage({ markdown: `${ICONS.failure} Questa chat non è collegata a nessun socio.` })
      return
    }

    const supabase = telegramServiceSupabaseClient()
    const { error } = await supabase
      .from('pauperwave_associate_telegram_links')
      .delete()
      .eq('chat_id', ctx.chat.id)
    if (error) throw error

    await ctx.replyWithRichMessage({
      markdown: `${ICONS.success} Chat scollegata.\n\nScrivimi di nuovo la tua email da socio per ricollegarla.`
    })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a scollegare la chat, riprova più tardi.`
    })
  }
}

registerDeepLink('scollegamento', scollegamentoCommandHandler)

export function registerCollegamentoCommand(commands: CommandGroup<Context>) {
  commands.command('collegamento', 'Verifica se questa chat è collegata a un socio', collegamentoCommandHandler)
  commands.command('scollegamento', 'Scollega questa chat dal tuo profilo socio', scollegamentoCommandHandler)
}
