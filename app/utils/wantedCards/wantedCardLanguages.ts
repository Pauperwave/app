// app\utils\wantedCards\wantedCardLanguages.ts
// Previously duplicated in wanted-cards/index.vue and GridView.vue — single source
// of truth for the language icons on wanted cards.
//
// Paper printing languages still active for Magic (as of 2024: only these six,
// after Russian/Korean/Traditional Chinese were dropped in 2022 and
// Portuguese/Simplified Chinese in 2024) — see the same comment in
// wanted-cards/FormFields.vue, where this list first got hardcoded. A real,
// bounded set (Wizards doesn't add print languages often), unlike
// Tournament.format/League.ruleset, which are live DB rows — see the
// StatusColor discussion in docs/PROGRESS.md-adjacent chat history for why
// those stay `string`.
export const WANTED_CARD_LANGUAGES = ['en', 'it', 'es', 'fr', 'de', 'ja'] as const
export type WantedCardLanguage = (typeof WANTED_CARD_LANGUAGES)[number]

// The form/table also need an explicit "no preference" sentinel, which is
// never itself a stored value (AddModal.vue/EditModal.vue map it to `null`
// on submit) — kept as its own type rather than folded into
// WantedCardLanguage so a DB row's actual language can never be typed as
// 'any' by mistake.
export type WantedCardLanguageFilter = 'any' | WantedCardLanguage

export const WANTED_CARD_LANGUAGE_ICONS: Record<WantedCardLanguage, string> = {
  en: 'i-circle-flags-gb',
  it: 'i-circle-flags-it',
  es: 'i-circle-flags-es',
  fr: 'i-circle-flags-fr',
  de: 'i-circle-flags-de',
  ja: 'i-circle-flags-jp'
}
