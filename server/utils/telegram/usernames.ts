// server\utils\telegram\usernames.ts
// Telegram @usernames of linked associates, asked to Telegram for each linked chat so a changed
// username is always current. Best-effort — anyone unlinked, without a username, or whose lookup
// fails is simply absent from the result. What Telegram answers is also saved on the link
// (telegram_username) whenever it changed, so the app can offer a link to the Telegram profile.
export async function fetchTelegramUsernames(
  associateUuids: string[]
): Promise<Map<string, string>> {
  const usernames = new Map<string, string>()
  const uniqueUuids = [...new Set(associateUuids)]
  if (uniqueUuids.length === 0) return usernames

  const supabase = telegramServiceSupabaseClient()
  const { data: links, error } = await supabase
    .from('pauperwave_associate_telegram_links')
    .select('associate_uuid, chat_id, telegram_username')
    .in('associate_uuid', uniqueUuids)
  if (error) {
    console.error('Failed to resolve Telegram usernames:', error.message)
    return usernames
  }

  const bot = useTelegramBot()
  const chats = await Promise.allSettled((links ?? []).map(link => bot.api.getChat(link.chat_id)))

  const changed: { associateUuid: string, username: string | null }[] = []
  chats.forEach((chat, index) => {
    const link = links?.[index]
    if (chat.status !== 'fulfilled' || !link) return

    const username = chat.value.username ?? null
    if (username) usernames.set(link.associate_uuid, username)
    if (username !== link.telegram_username) {
      changed.push({ associateUuid: link.associate_uuid, username })
    }
  })

  await Promise.all(changed.map(async ({ associateUuid, username }) => {
    const { error: updateError } = await supabase
      .from('pauperwave_associate_telegram_links')
      .update({ telegram_username: username })
      .eq('associate_uuid', associateUuid)
    if (updateError) console.error('Failed to save a Telegram username:', updateError.message)
  }))

  return usernames
}
