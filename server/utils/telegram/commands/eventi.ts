// server\utils\telegram\commands\eventi.ts
import { it } from 'date-fns/locale'

import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { FormattedString } from '@grammyjs/parse-mode'

interface UpcomingEventRow {
  name: string
  starts_at: string | null
  location: { name: string | null } | null
}

const MAX_EVENTS = 8

async function upcomingEventsMessage(): Promise<FormattedString> {
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
  if (!data.length) return new FormattedString('📅 Nessun evento in programma al momento.')

  const lines = (data as UpcomingEventRow[]).map((event) => {
    const date = event.starts_at ? formatTelegramDate(event.starts_at, 'd MMM', { locale: it }) : '?'
    const location = event.location?.name ? ` — ${event.location.name}` : ''
    return `• ${date}: ${event.name}${location}`
  })

  return fmt`📅 ${FormattedString.b('Prossimi eventi')}\n\n${FormattedString.join(lines, '\n')}`
}

export function registerEventiCommand(commands: CommandGroup<Context>) {
  commands.command('eventi', 'Prossimi eventi', async (ctx) => {
    const message = await upcomingEventsMessage()
      .catch(() => new FormattedString('⚠️ Non sono riuscito a recuperare gli eventi, riprova più tardi.'))
    await ctx.reply(message.text, {
      entities: message.entities,
      link_preview_options: { is_disabled: true }
    })
  })
}
