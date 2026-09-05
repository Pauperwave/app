// server\utils\telegram\format.ts

// Re-exported here so `fmt` auto-imports bot-wide, same pattern as
// telegramServiceSupabaseClient/publicSupabaseClient in supabaseClient.ts.
// `FormattedString` itself still needs an explicit
// `import { FormattedString } from '@grammyjs/parse-mode'` in every
// commands/*.ts that uses it — it's a class, used both as a value
// (`FormattedString.b(...)`) and a type (`: FormattedString`) in the same
// file, and Nuxt's auto-import only ever generates the value-side global
// declaration, not a matching type alias.
//
// FormattedString (v2 of the plugin, 2026-09-05) builds Telegram messages as
// plain text + a separate `entities`/`caption_entities` array instead of a
// markdown *string* parsed with `parse_mode` — the whole class of "did I
// escape this dynamic value" bugs the MarkdownV2 migration was working
// around simply doesn't exist here: raw text (card names, dates,
// descriptions) never needs escaping, because it's never parsed as markup in
// the first place. `.b()`/`.link()`/`.plain()` build up a message piece by
// piece; `FormattedString.join(parts, separator)` joins a list of them
// (e.g. with '\n'); `ctx.reply(fs.text, { entities: fs.entities })` and
// `ctx.replyWithPhoto(url, { caption: fs.caption, caption_entities: fs.caption_entities })`
// are the two send shapes every command file uses — never `parse_mode`
// anymore, it isn't compatible with passing `entities` explicitly.
export { FormattedString, fmt } from '@grammyjs/parse-mode'
