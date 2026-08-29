// server\utils\updateSettings.ts
import type { H3Event } from 'h3'
import type { JwtPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Shared by update-membership-fee.post.ts/update-trash-retention.post.ts —
// both write a partial patch (plus audit columns) to the single
// pauperwave_settings row (id: 1) and surface the same generic failure.
export async function updatePauperwaveSettings(
  supabase: SupabaseClient<Database>,
  event: H3Event,
  user: JwtPayload,
  patch: Database['public']['Tables']['pauperwave_settings']['Update']
) {
  const { data: settings, error } = await supabase
    .from('pauperwave_settings')
    .update({ ...patch, ...await auditColumnsForUpdate(event, user) })
    .eq('id', 1)
    .select()
    .single()

  if (error || !settings) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Settings update failed'
    })
  }

  return settings
}
