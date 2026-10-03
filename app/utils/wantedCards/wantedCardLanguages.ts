// app\utils\wantedCards\wantedCardLanguages.ts
import { ICONS } from '~/utils/icons'
// Single source of truth for the wanted cards' language icons (wanted-cards/index.vue and
// GridView.vue).
//
// Paper printing languages still active for Magic (six, after Russian/Korean/Traditional Chinese
// were dropped in 2022 and Portuguese/Simplified Chinese in 2024). A bounded set, unlike
// Tournament.format/League.ruleset, which are live DB rows and stay `string`.
export const WANTED_CARD_LANGUAGES = ['en', 'it', 'es', 'fr', 'de', 'ja'] as const
export type WantedCardLanguage = (typeof WANTED_CARD_LANGUAGES)[number]

// The form/table also need an explicit "no preference" sentinel, never stored
// (AddModal.vue/EditModal.vue map it to `null` on submit): a separate type so a DB row's language
// can't be typed 'any' by mistake
export type WantedCardLanguageFilter = 'any' | WantedCardLanguage

export const WANTED_CARD_LANGUAGE_ICONS: Record<WantedCardLanguage, string> = {
  en: ICONS.flagEn,
  it: ICONS.flagIt,
  es: ICONS.flagEs,
  fr: ICONS.flagFr,
  de: ICONS.flagDe,
  ja: ICONS.flagJa
}
