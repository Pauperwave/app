<!-- app\components\inputs\UPhoneInput.vue -->
<script setup lang="ts">
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import type { CountryCode } from 'libphonenumber-js/min'

interface Props {
  /** E.164 string ("+393203522674") once valid, '' otherwise — never the
   * masked display value, and never undefined (so consumers can type their
   * own `state.phone_number` as a plain `string`; valibot's v.custom is the
   * actual validity gate, not this component). */
  modelValue: string
  defaultCountry?: CountryCode
  name?: string
}

const { modelValue, defaultCountry = 'IT', name = 'phone' } = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// Every country libphonenumber-js knows (245, even on the `min` metadata
// build — "min" trims per-country pattern detail, not the country list
// itself), not a curated shortlist: an association open to any nationality
// can't hardcode who's allowed to have a phone number. USelectMenu's default
// search input is what makes 245 items usable. Names come from Intl's own
// region display names (no extra dependency, matches the UI's Italian copy).
const countryNames = new Intl.DisplayNames(['it'], { type: 'region' })

// label is the name alone (can wrap onto a second line for long ones); the
// dial code renders separately via #item-trailing as a UBadge, so a wrapped
// name doesn't drag the code down into the paragraph with it.
const countryItems = computed(() => getCountries()
  .map(iso2 => ({
    label: countryNames.of(iso2) ?? iso2,
    callingCode: getCountryCallingCode(iso2),
    value: iso2,
    icon: `i-circle-flags-${iso2.toLowerCase()}`
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'it')))

const country = ref<CountryCode>(defaultCountry)
const nationalNumber = ref('')

// Reparses an incoming E.164 modelValue (prefill/edit case) into the split
// country + national-number display state. Only reacts to real external
// changes — internal edits go straight from input to emit, not back through
// this watcher (modelValue only updates once a number is fully valid).
watch(() => modelValue, (value) => {
  if (!value) return
  const parsed = parsePhoneNumberFromString(value)
  if (parsed?.country) {
    country.value = parsed.country
    nationalNumber.value = parsed.formatNational()
  }
}, { immediate: true })

// AsYouType applies each supported country's real formatting/grouping rules
// (not a fixed mask — Austrian and Italian numbers don't group digits the
// same way), and re-emits the E.164 value once the number is valid.
function reformat(raw: string) {
  nationalNumber.value = new AsYouType(country.value).input(raw)
  const parsed = parsePhoneNumberFromString(nationalNumber.value, country.value)
  emit('update:modelValue', parsed?.isValid() ? parsed.number : '')
}

// Switching country reformats whatever digits are already typed instead of
// clearing the field.
watch(country, () => reformat(nationalNumber.value))
</script>

<template>
  <UFieldGroup class="w-full">
    <!-- w-auto + min-w-28: sized to fit "Italia" comfortably (the ~100%
         common case) without truncating, but free to grow for a selected
         country whose name doesn't fit — value's own truncate is dropped for
         the same reason (see itemLabel above). -->
    <USelectMenu
      v-model="country"
      :items="countryItems"
      value-key="value"
      class="w-auto min-w-28 shrink-0 max-w-full"
      :ui="{ content: 'min-w-72', itemLabel: 'whitespace-normal', value: 'whitespace-normal' }"
    >
      <template #leading>
        <UIcon :name="`i-circle-flags-${country.toLowerCase()}`" />
      </template>

      <template #item-trailing="{ item }">
        <UBadge color="neutral" variant="subtle" size="sm">
          +{{ item.callingCode }}
        </UBadge>
      </template>
    </USelectMenu>
    <UInput
      :model-value="nationalNumber"
      :name="name"
      autocomplete="tel-national"
      class="flex-1"
      @update:model-value="reformat(String($event))"
    />
  </UFieldGroup>
</template>
