<!-- app\pages\(public)\tesseramento\index.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import { format } from 'date-fns'

definePageMeta({ layout: 'public' })

const { t } = useI18n()

useSeoMeta({
  title: t('tesseramento.seoTitle'),
  description: t('tesseramento.seoDescription'),
  robots: 'noindex, nofollow'
})

const supabase = useSupabaseClient()
const session = useSupabaseSession()
// useSupabaseSession()'s Session type deliberately omits `.user` — the email
// has to come from useSupabaseUser() instead, populated async from
// auth.getClaims() (see auth/callback.vue's comment on the same caveat), so
// it can resolve a beat after `session` does.
const authUser = useSupabaseUser()
const toast = useToast()

// Same shape as associates/list/AddModal.vue, sharing associateFormSchema —
// see that file's schema comment for why v.string(msg) is used even where a
// v.pipe() constraint also has one.
const schema = v.object(associateFormSchema(t))
type Schema = v.InferOutput<typeof schema>

const state = reactive<Partial<Schema>>({
  associate_type: 'regular',
  first_name: '',
  last_name: '',
  email_address: '',
  phone_number: '',
  tax_code: '',
  born_location: '',
  born_date: undefined,
  born_province: '',
  born_state: '',
  residency_address: '',
  residency_house_number: null,
  residency_city: '',
  residency_province: '',
  residency_cap: '',
  mtgo_nickname: null,
  mtga_nickname: null,
  has_read_statute: false,
  consent_data: false,
  consent_social: false
})

// calendar sync — same pattern as AddModal.vue
const calendarDate = computed<CalendarDate | null>({
  get: () => state.born_date
    ? new CalendarDate(
      state.born_date.getFullYear(), state.born_date.getMonth() + 1, state.born_date.getDate()
    )
    : null,
  set: (newDate) => {
    state.born_date = newDate ? newDate.toDate(getLocalTimeZone()) : undefined
  }
})

function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}

const associateTypeOptions = computed(() => [
  { label: t('associate.types.regular'), value: 'regular' as const },
  { label: t('associate.types.sustaining'), value: 'sustaining' as const }
])

// Each step's field names, used to validate only that step on "Avanti" —
// UForm's validate({ name: [...] }) checks named fields regardless of
// whether they're currently rendered, so this works even though every other
// step's UFormFields are v-if'd out at the time.
const steps = [
  { value: 'email', title: t('tesseramento.steps.email.title'), fields: [] },
  { value: 'verify', title: t('tesseramento.steps.verify.title'), fields: [] },
  { value: 'associateType', title: t('associate.addModal.sections.associateType'), fields: ['associate_type'] },
  {
    value: 'personalInfo',
    title: t('associate.addModal.sections.personalInfo'),
    fields: ['first_name', 'last_name', 'phone_number']
  },
  {
    value: 'birthInfo',
    title: t('associate.addModal.sections.birthInfo'),
    fields: ['born_location', 'born_date', 'born_province', 'born_state']
  },
  { value: 'fiscalInfo', title: t('associate.addModal.sections.fiscalInfo'), fields: ['tax_code'] },
  {
    value: 'residencyInfo',
    title: t('associate.addModal.sections.residencyInfo'),
    fields: ['residency_address', 'residency_house_number', 'residency_city', 'residency_province', 'residency_cap']
  },
  { value: 'mtgNicknames', title: t('associate.addModal.sections.mtgNicknames'), fields: [] },
  {
    value: 'consents',
    title: t('associate.addModal.sections.consents'),
    fields: ['consent_data', 'consent_social', 'has_read_statute']
  }
] satisfies { value: string, title: string, fields: (keyof Schema)[] }[]

const currentStep = ref('email')
const stepIndex = computed(() => steps.findIndex(s => s.value === currentStep.value))

// A session already existing on load (back from the magic-link redirect, or
// a page refresh mid-flow) skips straight past email/verify — email is
// already proven at that point. state.email_address is only in-memory,
// though: the redirect through /auth/callback remounts this page fresh,
// wiping it back to '' — recovered here from authUser (the actual source of
// truth for "which email got verified"), not from local state that doesn't
// survive the round trip. Watches both session and authUser (not just
// session) since authUser can resolve a beat later — ||= so it's never
// overwritten once set, from whichever of the two settles it first.
watch([session, authUser], ([sessionValue, user]) => {
  if (!sessionValue) return
  if (user?.email) state.email_address ||= user.email
  if (currentStep.value === 'email' || currentStep.value === 'verify') {
    currentStep.value = 'associateType'
  }
}, { immediate: true })

const form = useTemplateRef('form')

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

function skipNicknames() {
  const next = steps[stepIndex.value + 1]
  if (next) currentStep.value = next.value
}

const submitting = ref(false)
const submitted = ref(false)

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
</script>

<template>
  <UPageCard v-if="submitted" :title="$t('tesseramento.successTitle')">
    <p class="text-muted">
      {{ $t('tesseramento.successDescription') }}
    </p>
  </UPageCard>

  <UPageCard v-else :title="$t('tesseramento.title')">
    <!-- disabled: purely a visual progress indicator — even with `linear`, Reka
         UI's Stepper still lets a click jump forward one step or back to any
         completed one, bypassing goNext()'s per-step validation. Navigation is
         only ever driven by currentStep from the Avanti/Indietro buttons.
         title hidden (sr-only, not removed — screen readers still get it):
         9 steps' Italian titles don't fit side by side at this page's width
         (max-w-2xl) without overlapping, at any viewport. The step text
         moves to a plain "Passo X di Y — Title" line below instead, same
         convention as the guided tour's stepIndicator. -->
    <UStepper
      v-model="currentStep"
      disabled
      :items="steps"
      size="sm"
      class="mb-2"
      :ui="{ title: 'sr-only' }"
    />
    <p class="text-base font-medium text-highlighted mb-4">
      {{ $t('tesseramento.stepIndicator', {
        current: stepIndex + 1, total: steps.length, title: steps[stepIndex]?.title
      }) }}
    </p>

    <UForm
      ref="form"
      :schema="schema"
      :state="state"
      class="space-y-4"
    >
      <template v-if="currentStep === 'email'">
        <UFormField :label="$t('tesseramento.steps.email.label')" name="email_address" required>
          <UInput
            v-model="state.email_address"
            type="email"
            autocomplete="email"
            :icon="ICONS.atSign"
            :placeholder="$t('tesseramento.steps.email.placeholder')"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end">
          <UButton
            :label="$t('tesseramento.steps.email.submit')"
            color="primary"
            :loading="sendingOtp"
            @click="sendOtp"
          />
        </div>
      </template>

      <template v-else-if="currentStep === 'verify'">
        <div class="flex flex-col items-center gap-4 py-6 text-center">
          <UIcon :name="ICONS.loading" class="animate-spin text-4xl" />
          <p class="text-muted">
            {{ $t('tesseramento.steps.verify.waiting', { email: state.email_address }) }}
          </p>
          <UButton
            :label="$t('tesseramento.steps.verify.resend')"
            variant="link"
            :loading="sendingOtp"
            @click="sendOtp"
          />
          <UButton
            :label="$t('tesseramento.back')"
            color="neutral"
            variant="ghost"
            @click="goBack"
          />
        </div>
      </template>

      <template v-else>
        <template v-if="currentStep === 'associateType'">
          <UFormField :label="$t('associate.addModal.fields.associateType')" name="associate_type">
            <USelect
              v-model="state.associate_type"
              :items="associateTypeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </template>

        <template v-else-if="currentStep === 'personalInfo'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <UFormField
              :label="$t('associate.addModal.fields.firstName')"
              name="first_name"
              required
            >
              <UInput v-model="state.first_name" autocomplete="given-name" class="w-full" />
            </UFormField>
            <UFormField
              :label="$t('associate.addModal.fields.lastName')"
              name="last_name"
              required
            >
              <UInput v-model="state.last_name" autocomplete="family-name" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.email')" name="email_address_display">
              <UInput :model-value="state.email_address" disabled class="w-full" />
            </UFormField>
            <UFormField
              :label="$t('associate.addModal.fields.phoneNumber')"
              name="phone_number"
              required
            >
              <UPhoneInput
                :model-value="state.phone_number ?? ''"
                name="phone_number"
                @update:model-value="state.phone_number = $event"
              />
            </UFormField>
          </div>
        </template>

        <template v-else-if="currentStep === 'birthInfo'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <UFormField
              :label="$t('associate.addModal.fields.birthLocation')"
              name="born_location"
              required
            >
              <UInput
                v-model="state.born_location"
                :placeholder="$t('associate.addModal.placeholders.birthLocation')"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('associate.addModal.fields.birthDate')"
              name="born_date"
              required
            >
              <!-- Hidden input for autofill and schema validation — same
                   pattern as AddModal.vue's, since the visible control below
                   is a UButton+UCalendar, not a native input browsers can
                   autofill on their own. -->
              <input
                v-model="state.born_date"
                type="date"
                name="born_date"
                autocomplete="bday"
                class="hidden"
              >
              <UPopover>
                <UButton
                  color="neutral"
                  variant="outline"
                  class="w-full justify-start"
                  :icon="ICONS.calendar"
                >
                  {{ state.born_date
                    ? formatDate(state.born_date)
                    : $t('associate.addModal.fields.selectBirthDate') }}
                </UButton>

                <template #content>
                  <UCalendar
                    v-model="calendarDate"
                    :default-value="new CalendarDate(1995, 1, 1)"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </UFormField>

            <UFormField
              :label="$t('associate.addModal.fields.birthProvince')"
              name="born_province"
              required
            >
              <UInput
                v-model="state.born_province"
                :placeholder="$t('associate.addModal.placeholders.birthProvince')"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="$t('associate.addModal.fields.birthState')"
              name="born_state"
              required
            >
              <UInput
                v-model="state.born_state"
                :placeholder="$t('associate.addModal.placeholders.birthState')"
                class="w-full"
              />
            </UFormField>
          </div>
        </template>

        <template v-else-if="currentStep === 'fiscalInfo'">
          <UFormField :label="$t('associate.addModal.fields.taxCode')" name="tax_code" required>
            <UInput
              v-model="state.tax_code"
              :placeholder="$t('associate.addModal.placeholders.taxCode')"
              class="w-full"
            />
          </UFormField>
        </template>

        <template v-else-if="currentStep === 'residencyInfo'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <UFormField
              :label="$t('associate.addModal.fields.residencyAddress')"
              name="residency_address"
              required
            >
              <UInput
                v-model="state.residency_address"
                autocomplete="address-line1"
                :placeholder="$t('associate.addModal.placeholders.residencyAddress')"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="$t('associate.addModal.fields.residencyHouseNumber')"
              name="residency_house_number"
            >
              <UInput
                :model-value="state.residency_house_number ?? ''"
                autocomplete="address-line2"
                :placeholder="$t('associate.addModal.placeholders.residencyHouseNumber')"
                class="w-full"
                @update:model-value="state.residency_house_number = ($event as string) || null"
              />
            </UFormField>
            <UFormField
              :label="$t('associate.addModal.fields.residencyCity')"
              name="residency_city"
              required
            >
              <UInput
                v-model="state.residency_city"
                autocomplete="address-level2"
                :placeholder="$t('associate.addModal.placeholders.residencyCity')"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="$t('associate.addModal.fields.residencyProvince')"
              name="residency_province"
              required
            >
              <UInput
                v-model="state.residency_province"
                autocomplete="address-level1"
                :placeholder="$t('associate.addModal.placeholders.residencyProvince')"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="$t('associate.addModal.fields.residencyCap')"
              name="residency_cap"
              required
            >
              <UInput
                v-model="state.residency_cap"
                autocomplete="postal-code"
                :placeholder="$t('associate.addModal.placeholders.residencyCap')"
                class="w-full"
              />
            </UFormField>
          </div>
        </template>

        <template v-else-if="currentStep === 'mtgNicknames'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <UFormField :label="$t('associate.addModal.fields.mtgoNickname')" name="mtgo_nickname">
              <UInput
                :model-value="state.mtgo_nickname ?? ''"
                class="w-full"
                @update:model-value="state.mtgo_nickname = ($event as string) || null"
              />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.mtgaNickname')" name="mtga_nickname">
              <UInput
                :model-value="state.mtga_nickname ?? ''"
                class="w-full"
                @update:model-value="state.mtga_nickname = ($event as string) || null"
              />
            </UFormField>
          </div>
        </template>

        <template v-else-if="currentStep === 'consents'">
          <div class="space-y-2">
            <UFormField name="has_read_statute">
              <UCheckbox
                v-model="state.has_read_statute"
                required
                :label="$t('associate.addModal.consents.statuteLabel')"
                size="lg"
              >
                <template #description>
                  <!-- External, not /tesseramento/statuto: the statute is the
                       association's own governance document, published on
                       the blog independently of this app — linking to that
                       canonical copy avoids two versions drifting apart. The
                       icon marks it as leaving the app's domain, unlike the
                       two consents below (still internal pages). -->
                  <a
                    href="https://blog.pauperwave.org/docs/statuto"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline inline-flex items-center gap-1"
                  >
                    {{ $t('tesseramento.steps.consents.openStatuto') }}
                    <UIcon :name="ICONS.externalLink" class="size-3.5" />
                  </a>
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="consent_data">
              <UCheckbox
                v-model="state.consent_data"
                required
                :label="$t('associate.addModal.consents.dataLabel')"
                size="lg"
              >
                <template #description>
                  <NuxtLink to="/tesseramento/informativa-dati" target="_blank" class="underline">
                    {{ $t('tesseramento.steps.consents.openData') }}
                  </NuxtLink>
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="consent_social">
              <UCheckbox
                v-model="state.consent_social"
                :label="$t('associate.addModal.consents.socialLabel')"
                size="lg"
              >
                <template #description>
                  {{ $t('associate.addModal.consents.socialDescription') }}
                </template>
              </UCheckbox>
            </UFormField>
          </div>
        </template>

        <div class="flex justify-between gap-2 pt-2">
          <UButton
            v-if="stepIndex > 0"
            :label="$t('tesseramento.back')"
            color="neutral"
            variant="subtle"
            @click="goBack"
          />
          <div v-else />

          <div class="flex gap-2">
            <UButton
              v-if="currentStep === 'mtgNicknames'"
              :label="$t('tesseramento.steps.mtgNicknames.skip')"
              color="neutral"
              variant="ghost"
              @click="skipNicknames"
            />

            <UButton
              v-if="currentStep !== 'consents'"
              :label="$t('tesseramento.next')"
              color="primary"
              @click="goNext"
            />
            <UButton
              v-else
              :label="$t('tesseramento.steps.consents.submit')"
              color="primary"
              :loading="submitting"
              @click="onSubmit"
            />
          </div>
        </div>
      </template>
    </UForm>
  </UPageCard>
</template>
