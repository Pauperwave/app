// app\composables\associates\useAssociateTelegramUsernamesQuery.ts
// Every associate linked to the Telegram bot, by associate uuid, with their @username — or null
// when they have none. For the link to their Telegram profile and the "no username" badge in
// AssociateTag.vue. Only organizers/admins can read it (RLS + column grant on
// pauperwave_associate_telegram_links): everybody else just gets an empty map.
export const ASSOCIATE_TELEGRAM_USERNAMES_KEY = ['associate-telegram-usernames']

export function useAssociateTelegramUsernamesQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: ASSOCIATE_TELEGRAM_USERNAMES_KEY,
    query: async (): Promise<Map<string, string | null>> => {
      const { data, error } = await supabase
        .from('pauperwave_associate_telegram_links')
        .select('associate_uuid, telegram_username')
      if (error) throw error

      return new Map(data.map(row => [row.associate_uuid, row.telegram_username]))
    }
  })
}
