// app\composables\associates\useTesseramentoFlow.ts
import * as v from 'valibot'
import { format } from 'date-fns'
import type { Ref } from 'vue'

type TesseramentoKind = 'new' | 'renewal' | 'blocked'
type Schema = v.InferOutput<ReturnType<typeof associateFormObjectSchema>>

// The slice of UForm the flow drives: the page owns the template ref
export interface TesseramentoForm {
  setErrors: (errors: { name: string, message: string }[]) => void
  validate: (options: { name?: (keyof Schema)[], silent: true }) => Promise<Schema | false>
}

// The whole /tesseramento wizard: the OTP login, the new/renewal/blocked branch once the email is
// verified, the 9-step form and its submission
export function useTesseramentoFlow(form: Ref<TesseramentoForm | null | undefined>) {
  const { t } = useI18n()
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()
  // useSupabaseSession()'s Session type omits `.user`: the email must come from useSupabaseUser(),
  // populated async from auth.getClaims() (see auth/callback.vue on the same caveat), so it can
  // resolve a beat after `session`
  const authUser = useSupabaseUser()
  const toast = useToast()

  // Same shape as associates/list/AddModal.vue, sharing associateFormSchema: see that file's schema
  // comment for why v.string(msg) is used even where a v.pipe() constraint also has one
  const schema = associateFormObjectSchema(t)
  const state = createAssociateFormState()

  // Each step's field names, used to validate only that step on "Avanti": UForm's validate({ name:
  // [...] }) checks named fields whether or not they are rendered, so it works though every other
  // step's UFormFields are v-if'd out
  const steps = [
    { value: 'email', title: t('tesseramento.steps.email.title'), fields: [] },
    { value: 'verify', title: t('tesseramento.steps.verify.title'), fields: [] },
    {
      value: 'associateType',
      title: t('associate.addModal.sections.associateType'),
      fields: ['associate_type']
    },
    {
      value: 'birthInfo',
      title: t('associate.addModal.sections.birthInfo'),
      fields: ['born_location', 'born_date', 'born_province', 'born_state']
    },
    // After birthInfo, not before: phone_number's required-ness depends on born_date (isMinor.ts: a
    // minor may not have their own phone), so asking birth date first lets that cross-field rule
    // apply when this step's "Avanti" validates phone_number, instead of skipping it (born_date
    // unknown) and only catching a missing phone at the final submit, on a step where the field
    // isn't visible
    {
      value: 'personalInfo',
      title: t('associate.addModal.sections.personalInfo'),
      fields: ['first_name', 'last_name', 'phone_number']
    },
    {
      value: 'fiscalInfo',
      title: t('associate.addModal.sections.fiscalInfo'),
      fields: ['tax_code']
    },
    {
      value: 'residencyInfo',
      title: t('associate.addModal.sections.residencyInfo'),
      fields: [
        'residency_address', 'residency_house_number', 'residency_city', 'residency_province',
        'residency_cap'
      ]
    },
    {
      value: 'consents',
      title: t('associate.addModal.sections.consents'),
      fields: ['consent_data', 'consent_social', 'has_read_statute']
    }
  ] satisfies { value: string, title: string, fields: (keyof Schema)[] }[]

  const currentStep = ref('email')
  const stepIndex = computed(() => steps.findIndex(s => s.value === currentStep.value))

  // Once the email is verified, checks whether this is a brand-new applicant or an
  // already-approved associate renewing: apply.post.ts's insert-only contract 409s any existing row
  // regardless of status, which was the only signal a returning member got, after filling out the
  // whole 9-step form again. 'renewal'/'blocked' short-circuit past the step wizard (see template);
  // 'new' goes on to the form
  const kind = ref<TesseramentoKind>('new')
  const renewalName = ref({ firstName: '', lastName: '' })

  // A session already present on load (back from the magic-link redirect, or a refresh mid-flow)
  // skips past email/verify: the email is already proven. state.email_address is only in-memory
  // though: the redirect through /auth/callback remounts this page, wiping it to '', so it is
  // recovered from authUser (the source of truth for "which email got verified"), not local state.
  // Watches both session and authUser (authUser can resolve a beat later); ||= so it is never
  // overwritten once set, by whichever settles it first
  watch([session, authUser], async ([sessionValue, user]) => {
    if (!sessionValue) return
    if (user?.email) state.email_address ||= user.email
    if (currentStep.value !== 'email' && currentStep.value !== 'verify') return

    const status = await $fetch('/api/associates/tesseramento-status')
    kind.value = status.kind
    if (status.kind === 'renewal') {
      renewalName.value = { firstName: status.firstName, lastName: status.lastName }
    }

    if (kind.value === 'new') currentStep.value = 'associateType'
  }, { immediate: true })

  const submitted = ref(false)

  const confirmingRenewal = ref(false)
  async function confirmRenewal() {
    confirmingRenewal.value = true
    try {
      await $fetch('/api/associates/renew', { method: 'POST' })
      submitted.value = true
    } catch (err) {
      toast.add({
        title: t('tesseramento.errorTitle'),
        description: t('tesseramento.errorGenericDescription', { message: toErrorMessage(err) }),
        color: 'error'
      })
    } finally {
      confirmingRenewal.value = false
    }
  }

  const emailSchema = v.pipe(
    v.string(t('login.emailRequired')),
    v.trim(),
    v.email(t('associate.addModal.validation.invalidEmail')),
    v.toLowerCase()
  )

  const sendingOtp = ref(false)

  async function sendOtp() {
    const result = v.safeParse(emailSchema, state.email_address)
    if (!result.success) {
      form.value?.setErrors([{ name: 'email_address', message: result.issues[0]!.message }])
      return
    }
    state.email_address = result.output

    sendingOtp.value = true
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: result.output,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/tesseramento`
        }
      })

      if (error) {
        toast.add({
          title: t('tesseramento.steps.email.errorTitle'),
          description: error.message,
          color: 'error'
        })
        return
      }

      toast.add({
        title: t('tesseramento.steps.email.linkSentTitle'),
        description: t('tesseramento.steps.email.linkSentDescription'),
        color: 'primary'
      })
      currentStep.value = 'verify'
    } finally {
      sendingOtp.value = false
    }
  }

  async function goNext() {
    const step = steps[stepIndex.value]
    if (!step) return

    if (step.fields.length) {
      const result = await form.value?.validate({ name: step.fields, silent: true })
      if (!result) return
    }

    const next = steps[stepIndex.value + 1]
    if (next) currentStep.value = next.value
  }

  function goBack() {
    const prev = steps[stepIndex.value - 1]
    if (prev) currentStep.value = prev.value
  }

  const submitting = ref(false)

  async function onSubmit() {
    const result = await form.value?.validate({ silent: true })
    if (!result) return

    submitting.value = true
    try {
      await $fetch('/api/associates/apply', {
        method: 'POST',
        body: {
          ...result,
          born_date: format(result.born_date, 'yyyy-MM-dd')
        }
      })
      submitted.value = true
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      toast.add({
        title: t('tesseramento.errorTitle'),
        description: statusCode === 409
          ? t('tesseramento.errorDuplicateDescription')
          : t('tesseramento.errorGenericDescription', { message: toErrorMessage(err) }),
        color: 'error'
      })
    } finally {
      submitting.value = false
    }
  }

  return {
    schema,
    state,
    steps,
    currentStep,
    stepIndex,
    kind,
    renewalName,
    submitted,
    sendingOtp,
    confirmingRenewal,
    submitting,
    sendOtp,
    confirmRenewal,
    goNext,
    goBack,
    onSubmit
  }
}
