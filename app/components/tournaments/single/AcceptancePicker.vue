<!-- app\components\tournaments\single\AcceptancePicker.vue -->
<script lang="ts" setup>
const { t } = useI18n()

interface User {
  id: number
  name: string
  email: string
}

interface Item {
  label: string
  description: string
  avatar: { alt: string }
  value: string
}

const users: User[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`
}))

const items: Item[] = users.map(user => ({
  label: user.name,
  description: user.email,
  avatar: { alt: user.name },
  value: String(user.id)
}))

const targetItems = ref<Item[]>([])
const sourceSelection = ref<Item[]>([])
const targetSelection = ref<Item[]>([])

const sourceItems = computed(() =>
  items.filter(item => !targetItems.value.some(t => t.value === item.value)))

function transferSelected() {
  targetItems.value = [...targetItems.value, ...sourceSelection.value]
  sourceSelection.value = []
}

function removeSelected() {
  targetItems.value = targetItems.value.filter(item =>
    !targetSelection.value.some(t => t.value === item.value))
  targetSelection.value = []
}
</script>

<template>
  <div class="flex items-stretch gap-4 w-full">
    <div class="flex flex-col flex-1 gap-1">
      <span class="text-sm font-medium text-highlighted">{{ t('tournament.single.acceptancePicker.preRegistered') }}</span>

      <UListbox
        v-model="sourceSelection"
        :items="sourceItems"
        multiple
        filter
        class="size-full"
      />
    </div>

    <div class="flex flex-col items-center justify-center gap-1">
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="outline"
        :disabled="!sourceSelection.length"
        @click="transferSelected"
      />
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="outline"
        :disabled="!targetSelection.length"
        @click="removeSelected"
      />
    </div>

    <div class="flex flex-col flex-1 gap-1">
      <span class="text-sm font-medium text-highlighted">{{ t('tournament.single.acceptancePicker.registeredPaid') }}</span>

      <UListbox
        v-model="targetSelection"
        :items="targetItems"
        multiple
        filter
        class="size-full"
      />
    </div>
  </div>
</template>
