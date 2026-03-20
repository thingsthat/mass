import { log } from 'core/src/helpers/logger';
import { Cohort } from 'core/src/personas/cohort.types';
import { ref, nextTick } from 'vue';

import { loadCachedCohorts, loadCohorts } from 'frontend/src/personas/api/cohortsApi';

const createCohortsState = () => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const allCohorts = ref<Cohort[]>([]);

  const loadAllCohorts = async () => {
    try {
      isLoading.value = true;

      const cachedCohorts = await loadCachedCohorts();
      allCohorts.value = cachedCohorts;
      log.debug(
        'PERSONA',
        '[useCohorts]',
        'Cached cohorts loaded:',
        cachedCohorts.length,
        'Total:',
        allCohorts.value.length
      );

      nextTick(async () => {
        const freshCohorts = await loadCohorts();
        allCohorts.value = freshCohorts;
        log.debug(
          'PERSONA',
          '[useCohorts]',
          'Fresh cohorts loaded:',
          freshCohorts.length,
          'Total:',
          allCohorts.value.length
        );
      });
    } catch (e) {
      log.error('PERSONA', '[useCohorts] Failed to load cohorts:', e);
      allCohorts.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const isStaticCohortId = (_id: string) => false;

  return {
    allCohorts,
    isLoading,
    error,
    isStaticCohortId,
    loadAllCohorts,
  };
};

export const globalCohortsState = createCohortsState();

export const useCohorts = () => {
  return globalCohortsState;
};
