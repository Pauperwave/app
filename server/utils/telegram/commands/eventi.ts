// server\utils\telegram\commands\eventi.ts
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Bot } from 'grammy'
import type { Database } from '#shared/utils/types/database'

// Telegram commands run outside any single HTTP request (the bot instance
// is a long-lived singleton, see bot.ts) — no H3Event to pass to
// serverSupabaseServiceRole. Same anon-client pattern as
// server/api/dev/test-login.post.ts's anonClient: this data is public
// anyway (same rows /calendario shows to anonymous visitors), so the
// anon key is the right key here, not the service-role secret.
function publicSupabaseClient() {
  const config = useRuntimeConfig()
  return createClient<Database>(config.public.supabase.url, config.public.supabase.key)
}

interface UpcomingEventRow {
  name: string
  starts_at: string | null
  location: { name: string | null } | null
}

const MAX_EVENTS = 8

async function upcomingEventsMessage(): Promise<string> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select('name, starts_at, location:locations(name)')
    .is('deleted_at', null)
    .in('status', ['published', 'ongoing'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(MAX_EVENTS)

  if (error) throw error
  if (!data.length) return '📅 Nessun evento in programma al momento.'

  const lines = (data as UpcomingEventRow[]).map((event) => {
    const date = event.starts_at ? format(new Date(event.starts_at), 'd MMM', { locale: it }) : '?'
    const location = event.location?.name ? ` — ${event.location.name}` : ''
    return `• ${date}: ${event.name}${location}`
  })

  return `📅 *Prossimi eventi*\n\n${lines.join('\n')}`
}

export function registerEventiCommand(bot: Bot) {
  bot.command('eventi', async (ctx) => {
    const message = await upcomingEventsMessage()
      .catch(() => '⚠️ Non sono riuscito a recuperare gli eventi, riprova più tardi.')
    await ctx.reply(message, { parse_mode: 'Markdown' })
  })
}
