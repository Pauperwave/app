<!-- app\components\inputs\UStatusSelect.vue -->
<script setup lang="ts">
interface StatusItem {
  label: string
  value: string
  icon: string
  color?: string
  disabled?: boolean
}

interface Props {
  modelValue?: string
  name?: string
  label?: string
  items: StatusItem[]
  placeholder?: string
  /** Width of the inner USelect — 'w-34' fits the associates toolbar filter
   *  this was originally built for; form usages (event/league/tournament
   *  AddModal.vue) pass 'w-full' to match their sibling fields. */
  class?: string
}

const {
  modelValue, name = 'status', label, items, placeholder, class: selectClass = 'w-34'
} = defineProps<Props>()
const { t } = useI18n()

const resolvedPlaceholder = computed(() => placeholder ?? t('inputs.statusSelect.placeholder'))

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const value = computed({
  get: () => modelValue,
  set: val => emit('update:modelValue', val)
})

const selectedItem = computed(() =>
  items.find(item => item.value === value.value)
)
</script>

<template>
  <UFormField :name="name" :label="label">
    <USelect
      v-model="value"
      :items="items"
      :placeholder="resolvedPlaceholder"
      value-key="value"
      :class="selectClass"
      :ui="{
        trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
      }"
    >
      <template #leading>
        <UIcon
          v-if="selectedItem"
          :name="selectedItem.icon"
          :class="[
            'size-5 shrink-0',
            selectedItem.color && `text-${selectedItem.color}`
          ]"
        />
      </template>

      <template #item="{ item }">
        <UIcon
          :name="item.icon"
          :class="[
            'size-5 shrink-0',
            item.color && `text-${item.color}`
          ]"
        />
        <span>{{ item.label }}</span>
      </template>
    </USelect>
  </UFormField>
</template>
