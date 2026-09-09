// server\utils\telegram\commands\account\collegamento.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { resolveAssociateUuidByChatId } from './linking'
import { registerDeepLink } from '../../deepLinks'

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

// Read-only check for "is this chat linked, and to whom" — distinct from
// actually linking (linking.ts's email-in-plain-text flow, triggered by
// /start). Useful when a chat isn't sure whether it already linked, or
// wants to confirm which socio it's linked as before relying on a
// personal command (/tessera, /iscrizioni).
// Extracted so it can be reused verbatim by t.me/<bot>?start=collegamento —
// see deepLinks.ts.
async function collegamentoCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return

  try {
    const associateUuid = await resolveAssociateUuidByChatId(ctx.chat.id)
    if (!associateUuid) {
      await ctx.replyWithRichMessage({
        markdown: '❌ Questa chat non è collegata a nessun socio.\n\n'
          + 'Scrivimi la tua email da socio per collegarla.\n\n'
          + 'Se non ti ricordi l\'email puoi scrivere a /supporto.'
      })
      return
    }

    const identity = await fetchAssociateIdentity(associateUuid)
    const name = identity ? `${identity.first_name ?? ''} ${identity.last_name ?? ''}`.trim() : null
    const email = identity?.email_address

    const lines = [`✅ Questa chat è collegata${name ? ` a ${name}` : ''}.`]
    if (email) lines.push(email)
    // \n\n, not \n — see core.ts's HELP_TEXT comment on Rich Message markdown.
    await ctx.replyWithRichMessage({ markdown: lines.join('\n\n') })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a verificare il collegamento, riprova più tardi.'
    })
  }
}

registerDeepLink('collegamento', collegamentoCommandHandler)

// Opposite of /collegamento — removes this chat's row from
// pauperwave_associate_telegram_links, same table linkChat() (linking.ts)
// upserts into. Extracted so it can be reused verbatim by
// t.me/<bot>?start=scollegamento — see deepLinks.ts.
async function scollegamentoCommandHandler(ctx: Context) {
  if (!ctx.chat?.id) return

  try {
    const associateUuid = await resolveAssociateUuidByChatId(ctx.chat.id)
    if (!associateUuid) {
      await ctx.replyWithRichMessage({ markdown: '❌ Questa chat non è collegata a nessun socio.' })
      return
    }

    const supabase = telegramServiceSupabaseClient()
    const { error } = await supabase
      .from('pauperwave_associate_telegram_links')
      .delete()
      .eq('chat_id', ctx.chat.id)
    if (error) throw error

    await ctx.replyWithRichMessage({
      markdown: '✅ Chat scollegata.\n\nScrivimi di nuovo la tua email da socio per ricollegarla.'
    })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a scollegare la chat, riprova più tardi.'
    })
  }
}

registerDeepLink('scollegamento', scollegamentoCommandHandler)

export function registerCollegamentoCommand(commands: CommandGroup<Context>) {
  commands.command('collegamento', 'Verifica se questa chat è collegata a un socio', collegamentoCommandHandler)
  commands.command('scollegamento', 'Scollega questa chat dal tuo profilo socio', scollegamentoCommandHandler)
}
