// server\utils\tournaments\deckAccess.ts
import type { H3Event } from 'h3'
import type { JwtPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

type Client = SupabaseClient<Database>

// A player manages their own decks from their profile; anyone else's need an admin
// ('manage-all-commander-decks' / 'delete-commander-deck', app/utils/permissions.ts). The player
// comes from the session, never from the request.
export async function requireAdminOrOwnPlayer(
  event: H3Event, supabase: Client, playerUuid: string
): Promise<JwtPayload> {
  const user = await requireUser(event)
  if (await hasAdminPermission(event, user)) return user

  const { data: ownPlayer } = await supabase
    .from('players')
    .select('uuid')
    .eq('user_id', user.sub)
    .maybeSingle()

  if (!ownPlayer || ownPlayer.uuid !== playerUuid) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Permessi di amministrazione richiesti, oppure non è un tuo mazzo'
    })
  }

  return user
}

// Same, starting from a deck: its owner is whoever the deck belongs to
export async function requireAdminOrDeckOwner(
  event: H3Event, supabase: Client, deckUuid: string
): Promise<JwtPayload> {
  await requireUser(event)

  const { data: deck, error } = await supabase
    .from('commander_decks')
    .select('player_uuid')
    .eq('uuid', deckUuid)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!deck) throw createError({ statusCode: 404, statusMessage: 'Mazzo non trovato' })

  return requireAdminOrOwnPlayer(event, supabase, deck.player_uuid)
}
