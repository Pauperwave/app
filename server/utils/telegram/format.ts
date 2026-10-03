// server\utils\telegram\format.ts

// Re-exported so `fmt` auto-imports bot-wide. `FormattedString` still needs an explicit import
// where used (value and type; auto-import only covers the value).
//
// FormattedString builds messages as plain text + an `entities` array instead of markdown +
// `parse_mode`, so raw dynamic values never need escaping. Send with `ctx.reply(fs.text, {
// entities: fs.entities })` or `ctx.replyWithPhoto(url, { caption: fs.caption, caption_entities:
// fs.caption_entities })`, never `parse_mode` (incompatible with `entities`).
export { FormattedString, fmt } from '@grammyjs/parse-mode'
