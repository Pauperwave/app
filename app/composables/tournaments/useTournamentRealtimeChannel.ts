// app\composables\tournaments\useTournamentRealtimeChannel.ts
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Options {
  // Waits for mount so a page that also renders on the server doesn't try to listen there
  clientOnly?: boolean
}

// Owns the lifecycle of one tournament-scoped Supabase Realtime channel: re-subscribes when the
// tournament changes and removes the channel on unmount. `listen` adds the `.on(...)` listeners.
export function useTournamentRealtimeChannel(
  tournamentUuid: MaybeRefOrGetter<string>,
  channelName: (uuid: string) => string,
  listen: (channel: RealtimeChannel, uuid: string) => RealtimeChannel,
  { clientOnly = false }: Options = {}
) {
  const supabase = useSupabaseClient()

  let channel: RealtimeChannel | null = null

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
    channel = null
  }

  function watchTournament() {
    watch(() => toValue(tournamentUuid), (uuid) => {
      unsubscribe()
      if (uuid) channel = listen(supabase.channel(channelName(uuid)), uuid).subscribe()
    }, { immediate: true })
  }

  if (clientOnly) onMounted(watchTournament)
  else watchTournament()

  onUnmounted(unsubscribe)
}
