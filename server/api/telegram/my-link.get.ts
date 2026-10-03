// server\api\telegram\my-link.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export type MyTelegramLinkStatus = 'linked' | 'not-linked' | 'no-associate'

export interface MyTelegramLink {
  status: MyTelegramLinkStatus
  username: string | null
}

// Whether the logged-in user's Telegram chat is linked to their associate, for the /telegram-bot
// page. Through the BFF because pauperwave_associate_telegram_links is readable by staff only;
// the caller can only ask about themselves (the associate comes from the session, never the
// request) and the chat id is never returned.
export default defineEventHandler(async (event): Promise<MyTelegramLink> => {
  const user = await requireUser(event)
  const associateUuid = await resolveAuditAssociateUuid(event, user)
  if (!associateUuid) return { status: 'no-associate', username: null }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await supabase
    .from('pauperwave_associate_telegram_links')
    .select('telegram_username')
    .eq('associate_uuid', associateUuid)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data
    ? { status: 'linked', username: data.telegram_username }
    : { status: 'not-linked', username: null }
})
