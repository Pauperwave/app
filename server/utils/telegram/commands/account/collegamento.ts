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
        markdown: '❌ Questa chat non è collegata a nessun socio.\n\nScrivimi la tua email da socio per collegarla.'
      })
      return
    }

    const identity = await fetchAssociateIdentity(associateUuid)
    const name = identity ? `${identity.first_name ?? ''} ${identity.last_name ?? ''}`.trim() : null
    const email = identity?.email_address

    const lines = [`✅ Questa chat è collegata${name ? ` a ${name}` : ''}.`]
    if (email) lines.push(email)
    await ctx.replyWithRichMessage({ markdown: lines.join('\n') })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a verificare il collegamento, riprova più tardi.'
    })
  }
}

registerDeepLink('collegamento', collegamentoCommandHandler)

export function registerCollegamentoCommand(commands: CommandGroup<Context>) {
  commands.command('collegamento', 'Verifica se questa chat è collegata a un socio', collegamentoCommandHandler)
}
