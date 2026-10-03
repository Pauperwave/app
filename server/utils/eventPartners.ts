// server\utils\eventPartners.ts
// Saves an event's partners as the whole list the form sent (event_partners, migration
// 20261003120000): the old rows go, the cleaned ones are inserted in order (array order = display
// order).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'
import { cleanEventPartners } from '#shared/utils/events/eventPartners'
import type { EventPartnerInput } from '#shared/utils/events/eventPartners'

export async function replaceEventPartners(
  supabase: SupabaseClient<Database>,
  eventUuid: string,
  partners: EventPartnerInput[] | undefined
) {
  // An older client that doesn't send the list leaves the partners alone.
  if (!partners) return

  const { error: deleteError } = await supabase
    .from('event_partners')
    .delete()
    .eq('event_uuid', eventUuid)
  if (deleteError) throw createError({ statusCode: 500, statusMessage: deleteError.message })

  const rows = cleanEventPartners(partners).map((partner, position) => ({
    event_uuid: eventUuid,
    name: partner.name,
    role: partner.role,
    logo_url: partner.logoUrl,
    link_url: partner.linkUrl,
    position
  }))
  if (!rows.length) return

  const { error: insertError } = await supabase.from('event_partners').insert(rows)
  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
}
