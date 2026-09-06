// server\utils\telegram\format.ts

// Re-exported so `fmt` auto-imports bot-wide (same pattern as
// telegramServiceSupabaseClient in supabaseClient.ts). `FormattedString`
// still needs an explicit import in every commands/*.ts that uses it — used
// as both a value and a type, and Nuxt auto-import only covers the value side.
//
// FormattedString builds messages as plain text + an `entities` array
// instead of a markdown string + `parse_mode` — raw dynamic values never
// need escaping, since nothing is parsed as markup. `.b()`/`.link()`/
// `.plain()` build a message piece by piece; `ctx.reply(fs.text, {
// entities: fs.entities })` / `ctx.replyWithPhoto(url, { caption: fs.caption,
// caption_entities: fs.caption_entities })` are the two send shapes used
// everywhere — never `parse_mode`, incompatible with passing `entities`.
export { FormattedString, fmt } from '@grammyjs/parse-mode'
