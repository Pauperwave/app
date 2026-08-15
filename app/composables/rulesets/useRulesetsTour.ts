// app\composables\rulesets\useRulesetsTour.ts
export function useRulesetsTour() {
  const { t } = useI18n()

  return useTour([
    {
      target: '#tour-rulesets-tabs',
      title: t('ruleset.tour.steps.tabs.title'),
      description: t('ruleset.tour.steps.tabs.description'),
      side: 'bottom'
    },
    {
      target: '#tour-rulesets-content',
      title: t('ruleset.tour.steps.content.title'),
      description: t('ruleset.tour.steps.content.description')
    },
    {
      target: null,
      title: t('ruleset.tour.steps.done.title'),
      description: t('ruleset.tour.steps.done.description')
    }
  ])
}
