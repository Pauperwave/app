// test\unit\composables\associates\useTesseramentoFlow.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useTesseramentoFlow } from '~/composables/associates/useTesseramentoFlow'
import type { TesseramentoForm } from '~/composables/associates/useTesseramentoFlow'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const toastAdd = vi.fn()
const signInWithOtp = vi.fn()
const fetchApi = vi.fn()
const session = ref<unknown>(null)
const authUser = ref<{ email?: string } | null>(null)

const setErrors = vi.fn()
const validate = vi.fn()
const form = ref<TesseramentoForm | null>({ setErrors, validate })

beforeEach(() => {
  for (const mock of [toastAdd, signInWithOtp, fetchApi, setErrors, validate]) mock.mockReset()
  session.value = null
  authUser.value = null
  form.value = { setErrors, validate }

  vi.stubGlobal('useToast', () => ({ add: toastAdd }))
  vi.stubGlobal('useSupabaseClient', () => ({ auth: { signInWithOtp } }))
  vi.stubGlobal('useSupabaseSession', () => session)
  vi.stubGlobal('useSupabaseUser', () => authUser)
  vi.stubGlobal('$fetch', fetchApi)
})

const flush = async () => {
  await nextTick()
  await Promise.resolve()
}

describe('the steps', () => {
  it('starts on the email step as a new applicant', () => {
    const flow = useTesseramentoFlow(form)

    expect(flow.currentStep.value).toBe('email')
    expect(flow.stepIndex.value).toBe(0)
    expect(flow.kind.value).toBe('new')
    expect(flow.submitted.value).toBe(false)
  })

  it('goes email, verify, then the nine-step form ending on the consents', () => {
    const { steps } = useTesseramentoFlow(form)

    expect(steps.map(step => step.value)).toEqual([
      'email', 'verify', 'associateType', 'birthInfo', 'personalInfo', 'fiscalInfo',
      'residencyInfo', 'consents'
    ])
  })

  it('asks the birth date before the phone, whose rule depends on it', () => {
    const { steps } = useTesseramentoFlow(form)
    const order = (value: string) => steps.findIndex(step => step.value === value)

    expect(order('birthInfo')).toBeLessThan(order('personalInfo'))
  })
})

describe('sendOtp', () => {
  it('rejects a malformed email on the field, without calling Supabase', async () => {
    const flow = useTesseramentoFlow(form)
    flow.state.email_address = 'not-an-email'

    await flow.sendOtp()

    expect(setErrors).toHaveBeenCalledWith([
      { name: 'email_address', message: 'associate.addModal.validation.invalidEmail' }
    ])
    expect(signInWithOtp).not.toHaveBeenCalled()
    expect(flow.currentStep.value).toBe('email')
  })

  it('rejects an empty email', async () => {
    const flow = useTesseramentoFlow(form)

    await flow.sendOtp()

    expect(setErrors).toHaveBeenCalledTimes(1)
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('sends the magic link to the trimmed, lowercased email and moves to verify', async () => {
    signInWithOtp.mockResolvedValue({ error: null })
    const flow = useTesseramentoFlow(form)
    flow.state.email_address = '  Ada@Example.COM '

    await flow.sendOtp()

    expect(flow.state.email_address).toBe('ada@example.com')
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/tesseramento`
      }
    })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'tesseramento.steps.email.linkSentTitle', color: 'primary'
    }))
    expect(flow.currentStep.value).toBe('verify')
    expect(flow.sendingOtp.value).toBe(false)
  })

  it('toasts the error and stays on the email step when Supabase refuses', async () => {
    signInWithOtp.mockResolvedValue({ error: { message: 'rate limited' } })
    const flow = useTesseramentoFlow(form)
    flow.state.email_address = 'ada@example.com'

    await flow.sendOtp()

    expect(toastAdd).toHaveBeenCalledWith({
      title: 'tesseramento.steps.email.errorTitle', description: 'rate limited', color: 'error'
    })
    expect(flow.currentStep.value).toBe('email')
    expect(flow.sendingOtp.value).toBe(false)
  })

  it('shows the sending state while the request is open', async () => {
    let finish: (value: { error: null }) => void = () => {}
    signInWithOtp.mockReturnValue(new Promise((resolve) => {
      finish = resolve
    }))
    const flow = useTesseramentoFlow(form)
    flow.state.email_address = 'ada@example.com'

    const pending = flow.sendOtp()
    expect(flow.sendingOtp.value).toBe(true)
    finish({ error: null })
    await pending

    expect(flow.sendingOtp.value).toBe(false)
  })
})

describe('after the email is verified', () => {
  it('does nothing without a session', async () => {
    useTesseramentoFlow(form)
    await flush()

    expect(fetchApi).not.toHaveBeenCalled()
  })

  it('starts the form for a new applicant, with the email taken from the user', async () => {
    fetchApi.mockResolvedValue({ kind: 'new' })
    session.value = { access_token: 't' }
    authUser.value = { email: 'ada@example.com' }

    const flow = useTesseramentoFlow(form)
    await flush()

    expect(fetchApi).toHaveBeenCalledWith('/api/associates/tesseramento-status')
    expect(flow.state.email_address).toBe('ada@example.com')
    expect(flow.kind.value).toBe('new')
    expect(flow.currentStep.value).toBe('associateType')
  })

  it('shows the one-click renewal, with the name, to an approved associate', async () => {
    fetchApi.mockResolvedValue({ kind: 'renewal', firstName: 'Ada', lastName: 'Lovelace' })
    session.value = { access_token: 't' }

    const flow = useTesseramentoFlow(form)
    await flush()

    expect(flow.kind.value).toBe('renewal')
    expect(flow.renewalName.value).toEqual({ firstName: 'Ada', lastName: 'Lovelace' })
    expect(flow.currentStep.value).toBe('email')
  })

  it('shows the blocked message to a pending or rejected request', async () => {
    fetchApi.mockResolvedValue({ kind: 'blocked' })
    session.value = { access_token: 't' }

    const flow = useTesseramentoFlow(form)
    await flush()

    expect(flow.kind.value).toBe('blocked')
    expect(flow.currentStep.value).toBe('email')
  })

  it('reacts to a session that arrives after the page is open', async () => {
    fetchApi.mockResolvedValue({ kind: 'new' })
    const flow = useTesseramentoFlow(form)
    await flush()
    expect(fetchApi).not.toHaveBeenCalled()

    session.value = { access_token: 't' }
    await flush()

    expect(flow.currentStep.value).toBe('associateType')
  })

  it('takes the email from the user when it resolves after the session', async () => {
    fetchApi.mockResolvedValue({ kind: 'new' })
    session.value = { access_token: 't' }
    const flow = useTesseramentoFlow(form)
    await flush()

    authUser.value = { email: 'late@example.com' }
    await flush()

    expect(flow.state.email_address).toBe('late@example.com')
  })

  it('does not overwrite an email already set', async () => {
    fetchApi.mockResolvedValue({ kind: 'blocked' })
    session.value = { access_token: 't' }
    authUser.value = { email: 'verified@example.com' }
    const flow = useTesseramentoFlow(form)
    flow.state.email_address = 'typed@example.com'

    authUser.value = { email: 'other@example.com' }
    await flush()

    expect(flow.state.email_address).toBe('typed@example.com')
  })

  it('does not check the status again once the form is under way', async () => {
    fetchApi.mockResolvedValue({ kind: 'new' })
    session.value = { access_token: 't' }
    const flow = useTesseramentoFlow(form)
    await flush()
    fetchApi.mockClear()

    session.value = { access_token: 'refreshed' }
    await flush()

    expect(fetchApi).not.toHaveBeenCalled()
    expect(flow.currentStep.value).toBe('associateType')
  })
})

describe('goNext and goBack', () => {
  it('moves on from a step without fields without validating', async () => {
    const flow = useTesseramentoFlow(form)

    await flow.goNext()

    expect(validate).not.toHaveBeenCalled()
    expect(flow.currentStep.value).toBe('verify')
  })

  it('validates only the fields of the current step, silently', async () => {
    validate.mockResolvedValue({})
    const flow = useTesseramentoFlow(form)
    flow.currentStep.value = 'birthInfo'

    await flow.goNext()

    expect(validate).toHaveBeenCalledWith({
      name: ['born_location', 'born_date', 'born_province', 'born_state'], silent: true
    })
    expect(flow.currentStep.value).toBe('personalInfo')
  })

  it('stays on the step when its fields are not valid', async () => {
    validate.mockResolvedValue(false)
    const flow = useTesseramentoFlow(form)
    flow.currentStep.value = 'personalInfo'

    await flow.goNext()

    expect(flow.currentStep.value).toBe('personalInfo')
  })

  it('does not move past the last step', async () => {
    validate.mockResolvedValue({})
    const flow = useTesseramentoFlow(form)
    flow.currentStep.value = 'consents'

    await flow.goNext()

    expect(flow.currentStep.value).toBe('consents')
  })

  it('goes back one step, and stops at the first', () => {
    const flow = useTesseramentoFlow(form)
    flow.currentStep.value = 'associateType'

    flow.goBack()
    expect(flow.currentStep.value).toBe('verify')

    flow.currentStep.value = 'email'
    flow.goBack()
    expect(flow.currentStep.value).toBe('email')
  })
})

describe('confirmRenewal', () => {
  it('posts the renewal and shows the success page', async () => {
    fetchApi.mockResolvedValue({})
    const flow = useTesseramentoFlow(form)

    await flow.confirmRenewal()

    expect(fetchApi).toHaveBeenCalledWith('/api/associates/renew', { method: 'POST' })
    expect(flow.submitted.value).toBe(true)
    expect(flow.confirmingRenewal.value).toBe(false)
  })

  it('toasts the error and does not show the success page when it fails', async () => {
    fetchApi.mockRejectedValue(new Error('boom'))
    const flow = useTesseramentoFlow(form)

    await flow.confirmRenewal()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'tesseramento.errorTitle', color: 'error'
    }))
    expect(flow.submitted.value).toBe(false)
    expect(flow.confirmingRenewal.value).toBe(false)
  })
})

describe('onSubmit', () => {
  const valid = { first_name: 'Ada', born_date: new Date(2000, 4, 17) }

  it('does not post when the form is not valid', async () => {
    validate.mockResolvedValue(false)
    const flow = useTesseramentoFlow(form)

    await flow.onSubmit()

    expect(fetchApi).not.toHaveBeenCalled()
    expect(flow.submitting.value).toBe(false)
  })

  it('validates the whole form, silently', async () => {
    validate.mockResolvedValue(false)
    const flow = useTesseramentoFlow(form)

    await flow.onSubmit()

    expect(validate).toHaveBeenCalledWith({ silent: true })
  })

  it('posts the form with the birth date as a plain date and shows the success page', async () => {
    validate.mockResolvedValue(valid)
    fetchApi.mockResolvedValue({})
    const flow = useTesseramentoFlow(form)

    await flow.onSubmit()

    expect(fetchApi).toHaveBeenCalledWith('/api/associates/apply', {
      method: 'POST',
      body: { first_name: 'Ada', born_date: '2000-05-17' }
    })
    expect(flow.submitted.value).toBe(true)
    expect(flow.submitting.value).toBe(false)
  })

  it('tells a duplicate request apart from any other failure', async () => {
    validate.mockResolvedValue(valid)
    fetchApi.mockRejectedValue({ statusCode: 409 })
    const flow = useTesseramentoFlow(form)

    await flow.onSubmit()

    expect(toastAdd).toHaveBeenCalledWith({
      title: 'tesseramento.errorTitle',
      description: 'tesseramento.errorDuplicateDescription',
      color: 'error'
    })
    expect(flow.submitted.value).toBe(false)
    expect(flow.submitting.value).toBe(false)
  })

  it('toasts the generic error for any other failure', async () => {
    validate.mockResolvedValue(valid)
    fetchApi.mockRejectedValue({ statusCode: 500 })
    const flow = useTesseramentoFlow(form)

    await flow.onSubmit()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      description: 'tesseramento.errorGenericDescription'
    }))
    expect(flow.submitted.value).toBe(false)
  })
})
