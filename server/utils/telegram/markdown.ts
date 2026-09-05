// server\utils\telegram\markdown.ts

// Every one of these characters must be backslash-escaped when it appears as
// ordinary text under Telegram's MarkdownV2 (https://core.telegram.org/bots/api#markdownv2-style)
// — including in hardcoded strings, not just interpolated values (a bare "."
// or "!" in a literal message breaks parsing exactly like an unescaped one
// coming from a card/tournament name would). escapeMd() is the one place
// that knows the full set; every command builds its messages by escaping
// dynamic values through it and wrapping intentional bold/link syntax with
// mdBold()/mdLink() below, rather than hand-escaping punctuation ad hoc.
const ESCAPE_PATTERN = /[_*[\]()~`>#+\-=|{}.!\\]/g

export function escapeMd(text: string): string {
  return text.replace(ESCAPE_PATTERN, '\\$&')
}

export function mdBold(text: string): string {
  return `*${escapeMd(text)}*`
}

// Inline link — unlike plain text, a link's URL only needs `)` and `\`
// escaped (same MarkdownV2 spec, a narrower rule than escapeMd's for text).
export function mdLink(text: string, url: string): string {
  return `[${escapeMd(text)}](${url.replace(/[)\\]/g, '\\$&')})`
}
