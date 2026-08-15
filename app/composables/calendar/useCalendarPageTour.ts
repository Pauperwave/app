// app\composables\calendar\useCalendarPageTour.ts

// Internal-dashboard tour for /calendar (PageInDevelopment's body slot, which
// embeds the same PublicCalendarPage.vue the public /calendario route uses —
// hence anchoring into that shared component's own template). Distinct key
// namespace from event.tour (reserved for /events' own tour) even though
// both live under "event" — see i18n's event.calendarTour.
//
// Every step's `description` holds the i18n KEYPATH, not the resolved string
// (unlike `title`) — same convention as useShortcutsTour.ts: calendar/index.vue
// overrides TourGuide's #description slot to render all of them via <i18n-t>,
// since the "publicLink" step needs its {link} placeholder to render as a
// real clickable anchor, not plain text.
export function useCalendarPageTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-calendar-public-link',
      title: t('event.calendarTour.steps.publicLink.title'),
      description: 'event.calendarTour.steps.publicLink.description',
      side: 'bottom'
    },
    {
      target: '#tour-calendar-month-picker',
      title: t('event.calendarTour.steps.monthPicker.title'),
      description: 'event.calendarTour.steps.monthPicker.description'
    },
    {
      target: '#tour-calendar-cards',
      title: t('event.calendarTour.steps.cards.title'),
      description: 'event.calendarTour.steps.cards.description'
    },
    {
      target: null,
      title: t('event.calendarTour.steps.done.title'),
      description: 'event.calendarTour.steps.done.description'
    }
  ])
}
