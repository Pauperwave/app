<script lang="ts" setup>
interface User {
  id: number
  name: string
  email: string
}

// Your data
const source = ref<User[]>(
  Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`
  }))
)

const target = ref<User[]>([])

// Selection state
const selectedSource = ref<number[]>([])
const selectedTarget = ref<number[]>([])

// Helper functions
const isSelected = (id: number, list: 'source' | 'target') => {
  return list === 'source'
    ? selectedSource.value.includes(id)
    : selectedTarget.value.includes(id)
}

const toggleSelection = (id: number, list: 'source' | 'target') => {
  const selected = list === 'source' ? selectedSource : selectedTarget
  const index = selected.value.indexOf(id)

  if (index > -1) {
    selected.value.splice(index, 1)
  } else {
    selected.value.push(id)
  }
}

// Transfer functions - Move selected
const moveToTarget = () => {
  const itemsToMove = source.value.filter(item => selectedSource.value.includes(item.id))
  target.value.push(...itemsToMove)
  source.value = source.value.filter(item => !selectedSource.value.includes(item.id))
  selectedSource.value = []
}

const moveToSource = () => {
  const itemsToMove = target.value.filter(item => selectedTarget.value.includes(item.id))
  source.value.push(...itemsToMove)
  target.value = target.value.filter(item => !selectedTarget.value.includes(item.id))
  selectedTarget.value = []
}

// Transfer functions - Move all
const moveAllToTarget = () => {
  target.value.push(...source.value)
  source.value = []
  selectedSource.value = []
}

const moveAllToSource = () => {
  source.value.push(...target.value)
  target.value = []
  selectedTarget.value = []
}

const toggleSelectAll = (list: 'source' | 'target') => {
  const items = list === 'source' ? source.value : target.value
  const selected = list === 'source' ? selectedSource : selectedTarget

  if (selected.value.length === items.length) {
    selected.value = []
  } else {
    selected.value = items.map(item => item.id)
  }
}

// Keyboard shortcuts
defineShortcuts({
  arrowright: {
    handler: () => {
      if (selectedSource.value.length > 0) moveToTarget()
    }
  },
  arrowleft: {
    handler: () => {
      if (selectedTarget.value.length > 0) moveToSource()
    }
  }
})
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
    <!-- Source List (Pre-registered) -->
    <UCard class="h-full flex flex-col">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UCheckbox
              :model-value="source.length > 0 && selectedSource.length === source.length"
              :indeterminate="selectedSource.length > 0 && selectedSource.length < source.length"
              @update:model-value="toggleSelectAll('source')"
            />
            <h3 class="font-semibold">
              Pre-registrati
            </h3>
          </div>
          <UBadge
            :label="`${source.length}${selectedSource.length > 0 ? ` (${selectedSource.length} selezionati)` : ''}`"
            variant="subtle"
          />
        </div>
      </template>

      <div class="space-y-2 max-h-[60vh] overflow-y-auto">
        <div
          v-for="user in source"
          :key="user.id"
          class="flex items-center gap-2 p-2 rounded-lg border border-default hover:bg-muted cursor-pointer transition-colors"
          :class="{ 'bg-primary/10 border-primary': isSelected(user.id, 'source') }"
          @click="toggleSelection(user.id, 'source')"
        >
          <UCheckbox
            :model-value="isSelected(user.id, 'source')"
            @update:model-value="toggleSelection(user.id, 'source')"
          />
          <UAvatar :alt="user.name" size="sm" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate">
              {{ user.name }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ user.email }}
            </p>
          </div>
        </div>
        <div v-if="source.length === 0" class="flex flex-col items-center justify-center py-12 text-muted">
          <UIcon name="i-lucide-users-round" class="w-12 h-12 mb-3 opacity-50" />
          <p class="text-sm">
            Nessun pre-registrato
          </p>
        </div>
      </div>
    </UCard>

    <!-- Transfer Buttons -->
    <div class="flex lg:flex-col gap-2 justify-center">
      <!-- Move selected to target -->
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="outline"
        :disabled="selectedSource.length === 0"
        class="lg:rotate-0"
        @click="moveToTarget"
      />
      <!-- Move all to target -->
      <UButton
        icon="i-lucide-chevrons-right"
        color="neutral"
        variant="outline"
        :disabled="source.length === 0"
        class="lg:rotate-0"
        @click="moveAllToTarget"
      />
      <!-- Move selected to source -->
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="outline"
        :disabled="selectedTarget.length === 0"
        class="lg:rotate-0"
        @click="moveToSource"
      />
      <!-- Move all to source -->
      <UButton
        icon="i-lucide-chevrons-left"
        color="neutral"
        variant="outline"
        :disabled="target.length === 0"
        class="lg:rotate-0"
        @click="moveAllToSource"
      />
    </div>

    <!-- Target List (Accepted) -->
    <UCard class="h-full flex flex-col">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UCheckbox
              :model-value="target.length > 0 && selectedTarget.length === target.length"
              :indeterminate="selectedTarget.length > 0 && selectedTarget.length < target.length"
              @update:model-value="toggleSelectAll('target')"
            />
            <h3 class="font-semibold">
              Iscritti (Pagato)
            </h3>
          </div>
          <UBadge
            :label="`${target.length}${selectedTarget.length > 0 ? ` (${selectedTarget.length} sel.)` : ''}`"
            color="primary"
            variant="subtle"
          />
        </div>
      </template>

      <div class="space-y-2 max-h-[60vh] overflow-y-auto">
        <div
          v-for="user in target"
          :key="user.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-default hover:bg-muted cursor-pointer transition-colors"
          :class="{ 'bg-primary/10 border-primary': isSelected(user.id, 'target') }"
          @click="toggleSelection(user.id, 'target')"
        >
          <UCheckbox
            :model-value="isSelected(user.id, 'target')"
            @update:model-value="toggleSelection(user.id, 'target')"
          />
          <UAvatar :alt="user.name" size="sm" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate">
              {{ user.name }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ user.email }}
            </p>
          </div>
        </div>
        <div v-if="target.length === 0" class="flex flex-col items-center justify-center py-12 text-muted">
          <UIcon name="i-lucide-users-round" class="w-12 h-12 mb-3 opacity-50" />
          <p class="text-sm">
            Nessun iscritto
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
