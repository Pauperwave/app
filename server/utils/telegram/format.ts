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

// Rich Message markdown hard line break — CommonMark's own syntax (two
// trailing spaces before \n), needed to keep fields of one "card" stacked
// tightly (no visible gap) while still separating distinct cards from each
// other with a real paragraph break (\n\n). A plain \n alone is a soft
// break there and gets collapsed/ignored; \n\n everywhere instead would
// give every card the *same* spacing as its own internal fields, making
// them visually indistinguishable — confirmed 2026-09-09 on /iscrizioni
// ("mancano spazi fra un torneo e l'altro").
export const MD_BREAK = '  \n'
