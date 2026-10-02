// app\composables\associates\useAssociateTelegramLinksRealtime.ts
// Refreshes every Telegram status icon live: the bot links an associate or updates their @username
// from any message they send (user request, 2026-10-02). Mounted once in the default layout, not per
// AssociateTag, so there is a single channel. Same "invalidate, don't merge payloads" approach as
// useTournamentMatchResultsRealtime.ts; RLS limits the events to organizers/admins.
export function useAssociateTelegramLinksRealtime() {
  const supabase = useSupabaseClient()
  const queryCache = useQueryCache()

  let channel: ReturnType<typeof supabase.channel> | null = null

  // Client only: the layout also renders on the server, where there is nothing to listen to.
  onMounted(() => {
    channel = supabase
      .channel('associate-telegram-links')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pauperwave_associate_telegram_links' },
        () => {
          queryCache.invalidateQueries({ key: ASSOCIATE_TELEGRAM_USERNAMES_KEY })
        }
      )
      .subscribe()
  })

  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })
}
