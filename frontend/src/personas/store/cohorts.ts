import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import type { Cohort } from 'core/src/personas/cohort.types';

export const useCohortsStore = defineStore('cohorts', () => {
  // Cohort state
  const cohorts = ref<Cohort[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed values
  const cohortCount = computed(() => cohorts.value.length);
  const hasCohorts = computed(() => cohorts.value.length > 0);

  // Get cohort by ID
  const getCohortById = computed(
    () => (id: string) => cohorts.value.find(cohort => cohort.id === id)
  );

  // Get cohorts sorted by update date (most recent first)
  const sortedCohorts = computed(() =>
    [...cohorts.value].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || '');
      const dateB = new Date(b.updated_at || b.created_at || '');
      return dateB.getTime() - dateA.getTime();
    })
  );

  // Cohort management methods
  function setCohorts(cohortList: Cohort[]) {
    cohorts.value = cohortList;
  }

  function addCohort(cohort: Cohort) {
    // Check if cohort already exists to avoid duplicates
    const existingIndex = cohorts.value.findIndex(c => c.id === cohort.id);
    if (existingIndex === -1) {
      cohorts.value.push(cohort);
    } else {
      // Update existing cohort
      cohorts.value[existingIndex] = cohort;
    }
  }

  function updateCohort(cohortId: string, updates: Partial<Cohort>) {
    const index = cohorts.value.findIndex(c => c.id === cohortId);
    if (index !== -1) {
      cohorts.value[index] = {
        ...cohorts.value[index],
        ...updates,
        updated_at: new Date(),
      };
    }
  }

  function removeCohort(cohortId: string) {
    const index = cohorts.value.findIndex(c => c.id === cohortId);
    if (index !== -1) {
      cohorts.value.splice(index, 1);
    }
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setError(message: string | null) {
    error.value = message;
  }

  function clearError() {
    error.value = null;
  }

  // Clear all data (called on logout)
  function clearCohorts() {
    cohorts.value = [];
    error.value = null;
  }

  return {
    // State
    cohorts,
    isLoading,
    error,

    // Computed
    cohortCount,
    hasCohorts,
    getCohortById,
    sortedCohorts,

    // Methods
    setCohorts,
    addCohort,
    updateCohort,
    removeCohort,
    setLoading,
    setError,
    clearError,
    clearCohorts,
  };
});
