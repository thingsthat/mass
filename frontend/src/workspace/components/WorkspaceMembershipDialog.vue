<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import PersonaAvatar from 'frontend/src/components/PersonaAvatar.vue';
import Button from 'frontend/src/components/ui/button/Button.vue';
import Dialog from 'frontend/src/components/ui/dialog/Dialog.vue';
import DialogContent from 'frontend/src/components/ui/dialog/DialogContent.vue';
import DialogHeader from 'frontend/src/components/ui/dialog/DialogHeader.vue';
import DialogTitle from 'frontend/src/components/ui/dialog/DialogTitle.vue';
import Tabs from 'frontend/src/components/ui/tabs/Tabs.vue';
import TabsContent from 'frontend/src/components/ui/tabs/TabsContent.vue';
import TabsList from 'frontend/src/components/ui/tabs/TabsList.vue';
import TabsTrigger from 'frontend/src/components/ui/tabs/TabsTrigger.vue';
import { useCohorts } from 'frontend/src/personas/hooks/useCohorts';
import { usePersonas } from 'frontend/src/personas/hooks/usePersonas';

import type { PersonaItem } from 'core/src/personas/persona.types';
import type { Conversation } from 'core/src/workspace/conversation.types';

const props = defineProps<{
  open: boolean;
  conversation: Conversation | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  save: [payload: { personaIds: string[]; cohortIds: string[] }];
}>();

const { personasAll, loadPersonas } = usePersonas();
const { allCohorts, loadAllCohorts } = useCohorts();

const selectedPersonaIds = ref<string[]>([]);
const selectedCohortIds = ref<string[]>([]);

const filterAgeMin = ref<number | null>(null);
const filterAgeMax = ref<number | null>(null);
const filterCohortId = ref<string | null>(null);
const filterLocation = ref<string | null>(null);
const filterRelationshipStatus = ref<string | null>(null);
const filterSexualOrientation = ref<string | null>(null);

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const selectedPersonaCount = computed(() => selectedPersonaIds.value.length);
const selectedCohortCount = computed(() => selectedCohortIds.value.length);

const ageOptions = computed(() => {
  const ages = new Set<number>();
  personasAll.value.forEach(persona => {
    const age = persona.metadata?.age;
    if (typeof age === 'number' && age > 0) {
      ages.add(age);
    }
  });
  return Array.from(ages).sort((a, b) => a - b);
});

const cohortOptionsForFilter = computed(() =>
  allCohorts.value.map(cohort => ({ id: cohort.id, name: cohort.name || cohort.id }))
);

const locationOptions = computed(() => {
  const locations = new Set<string>();
  personasAll.value.forEach(persona => {
    const location = persona.metadata?.location?.trim();
    if (location) {
      locations.add(location);
    }
  });
  return Array.from(locations).sort((a, b) => a.localeCompare(b));
});

const relationshipStatusOptions = computed(() => {
  const statuses = new Set<string>();
  personasAll.value.forEach(persona => {
    const status = persona.metadata?.relationship_status?.trim();
    if (status) {
      statuses.add(status);
    }
  });
  return Array.from(statuses).sort((a, b) => a.localeCompare(b));
});

const sexualOrientationOptions = computed(() => {
  const orientations = new Set<string>();
  personasAll.value.forEach(persona => {
    const orientation = persona.metadata?.sexual_orientation?.trim();
    if (orientation) {
      orientations.add(orientation);
    }
  });
  return Array.from(orientations).sort((a, b) => a.localeCompare(b));
});

function personaMatchesFilters(persona: PersonaItem): boolean {
  const age = persona.metadata?.age;
  if (filterAgeMin.value != null && (typeof age !== 'number' || age < filterAgeMin.value)) {
    return false;
  }
  if (filterAgeMax.value != null && (typeof age !== 'number' || age > filterAgeMax.value)) {
    return false;
  }
  if (filterLocation.value != null) {
    const location = persona.metadata?.location?.trim();
    if (!location || location !== filterLocation.value) {
      return false;
    }
  }
  if (filterRelationshipStatus.value != null) {
    const status = persona.metadata?.relationship_status?.trim();
    if (!status || status !== filterRelationshipStatus.value) {
      return false;
    }
  }
  if (filterSexualOrientation.value != null) {
    const orientation = persona.metadata?.sexual_orientation?.trim();
    if (!orientation || orientation !== filterSexualOrientation.value) {
      return false;
    }
  }
  if (filterCohortId.value != null) {
    const cohort = allCohorts.value.find(c => c.id === filterCohortId.value);
    const cohortPersonaIds = cohort?.data?.persona_ids ?? [];
    if (!cohortPersonaIds.includes(persona.id)) {
      return false;
    }
  }
  return true;
}

const filteredPersonas = computed(() =>
  personasAll.value.filter(persona => personaMatchesFilters(persona))
);

const hasActiveFilters = computed(
  () =>
    filterAgeMin.value != null ||
    filterAgeMax.value != null ||
    filterCohortId.value != null ||
    filterLocation.value != null ||
    filterRelationshipStatus.value != null ||
    filterSexualOrientation.value != null
);

function clearFilters() {
  filterAgeMin.value = null;
  filterAgeMax.value = null;
  filterCohortId.value = null;
  filterLocation.value = null;
  filterRelationshipStatus.value = null;
  filterSexualOrientation.value = null;
}

watch(
  () => [props.open, props.conversation] as const,
  ([open, conversation]) => {
    if (open && conversation) {
      selectedPersonaIds.value = [...(conversation.persona_ids ?? [])];
      selectedCohortIds.value = [...(conversation.cohort_ids ?? [])];
      clearFilters();
      loadPersonas(false);
      loadAllCohorts();
    }
  },
  { immediate: true }
);

function togglePersona(id: string) {
  const idx = selectedPersonaIds.value.indexOf(id);
  if (idx >= 0) {
    selectedPersonaIds.value = selectedPersonaIds.value.filter(pid => pid !== id);
  } else {
    selectedPersonaIds.value = [...selectedPersonaIds.value, id];
  }
}

function toggleCohort(id: string) {
  const idx = selectedCohortIds.value.indexOf(id);
  if (idx >= 0) {
    selectedCohortIds.value = selectedCohortIds.value.filter(cid => cid !== id);
  } else {
    selectedCohortIds.value = [...selectedCohortIds.value, id];
  }
}

function handleSave() {
  emit('save', {
    personaIds: selectedPersonaIds.value,
    cohortIds: selectedCohortIds.value,
  });
  isOpen.value = false;
}

function handleOpenChange(value: boolean) {
  emit('update:open', value);
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent
      class="flex h-[42rem] max-h-[85vh] w-full flex-col gap-4 sm:max-w-3xl sm:min-w-[28rem]"
      aria-describedby="membership-dialog-description"
    >
      <DialogHeader>
        <DialogTitle>Add personas and cohorts</DialogTitle>
        <p id="membership-dialog-description" class="text-muted-foreground text-sm">
          {{ selectedPersonaCount }} persona{{ selectedPersonaCount === 1 ? '' : 's' }},
          {{ selectedCohortCount }} cohort{{ selectedCohortCount === 1 ? '' : 's' }} selected
        </p>
      </DialogHeader>

      <Tabs default-value="personas" class="flex min-h-0 flex-1 flex-col gap-3">
        <TabsList class="w-full shrink-0 sm:w-auto">
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="personas" class="mt-0 flex min-h-0 flex-1 flex-col gap-3 outline-none">
          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <template v-if="ageOptions.length">
              <label class="text-muted-foreground shrink-0 text-xs font-medium">Age</label>
              <select
                v-model="filterAgeMin"
                class="bg-background border-input rounded-md border px-2 py-1 text-sm"
                aria-label="Minimum age"
              >
                <option :value="null">Any min</option>
                <option v-for="age in ageOptions" :key="'min-' + age" :value="age">
                  {{ age }}
                </option>
              </select>
              <span class="text-muted-foreground shrink-0 text-xs">to</span>
              <select
                v-model="filterAgeMax"
                class="bg-background border-input rounded-md border px-2 py-1 text-sm"
                aria-label="Maximum age"
              >
                <option :value="null">Any max</option>
                <option v-for="age in ageOptions" :key="'max-' + age" :value="age">
                  {{ age }}
                </option>
              </select>
            </template>
            <template v-if="cohortOptionsForFilter.length">
              <label class="text-muted-foreground shrink-0 text-xs font-medium">Cohort</label>
              <select
                v-model="filterCohortId"
                class="bg-background border-input rounded-md border px-2 py-1 text-sm"
                aria-label="Filter by cohort"
              >
                <option :value="null">Any</option>
                <option
                  v-for="cohort in cohortOptionsForFilter"
                  :key="cohort.id"
                  :value="cohort.id"
                >
                  {{ cohort.name }}
                </option>
              </select>
            </template>
            <template v-if="locationOptions.length">
              <label class="text-muted-foreground shrink-0 text-xs font-medium">Location</label>
              <select
                v-model="filterLocation"
                class="bg-background border-input rounded-md border px-2 py-1 text-sm"
                aria-label="Filter by location"
              >
                <option :value="null">Any</option>
                <option v-for="loc in locationOptions" :key="loc" :value="loc">
                  {{ loc }}
                </option>
              </select>
            </template>
            <template v-if="relationshipStatusOptions.length">
              <label class="text-muted-foreground shrink-0 text-xs font-medium">Relationship</label>
              <select
                v-model="filterRelationshipStatus"
                class="bg-background border-input rounded-md border px-2 py-1 text-sm"
                aria-label="Filter by relationship status"
              >
                <option :value="null">Any</option>
                <option v-for="status in relationshipStatusOptions" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </template>
            <template v-if="sexualOrientationOptions.length">
              <label class="text-muted-foreground shrink-0 text-xs font-medium">Sexuality</label>
              <select
                v-model="filterSexualOrientation"
                class="bg-background border-input rounded-md border px-2 py-1 text-sm"
                aria-label="Filter by sexual orientation"
              >
                <option :value="null">Any</option>
                <option
                  v-for="orientation in sexualOrientationOptions"
                  :key="orientation"
                  :value="orientation"
                >
                  {{ orientation }}
                </option>
              </select>
            </template>
            <Button
              v-if="hasActiveFilters"
              type="button"
              variant="ghost"
              class="shrink-0 text-xs"
              @click="clearFilters"
            >
              Clear filters
            </Button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <ul class="flex flex-col gap-1">
              <li
                v-for="persona in filteredPersonas"
                :key="persona.id"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                @click="togglePersona(persona.id)"
              >
                <PersonaAvatar
                  :hash-key="persona.id"
                  variant="selectable"
                  :selected="selectedPersonaIds.includes(persona.id)"
                />
                <span class="text-sm">{{ persona.name || persona.id }}</span>
              </li>
            </ul>
            <p
              v-if="personasAll.length && !filteredPersonas.length"
              class="text-muted-foreground py-4 text-center text-sm"
            >
              No personas match the current filters.
            </p>
            <p v-if="!personasAll.length" class="text-muted-foreground py-4 text-center text-sm">
              No personas available.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="cohorts" class="mt-0 flex min-h-0 flex-1 flex-col gap-3 outline-none">
          <div class="min-h-0 flex-1 overflow-y-auto">
            <ul class="flex flex-col gap-1">
              <li
                v-for="cohort in allCohorts"
                :key="cohort.id"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                @click="toggleCohort(cohort.id)"
              >
                <PersonaAvatar
                  :hash-key="cohort.id"
                  variant="selectable"
                  :selected="selectedCohortIds.includes(cohort.id)"
                />
                <span class="text-sm">{{ cohort.name || cohort.id }}</span>
              </li>
            </ul>
            <p v-if="!allCohorts.length" class="text-muted-foreground py-4 text-center text-sm">
              No cohorts available.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div class="flex shrink-0 justify-end gap-2">
        <Button type="button" variant="outline" @click="isOpen = false">Cancel</Button>
        <Button type="button" @click="handleSave">Done</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
