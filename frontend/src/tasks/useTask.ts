import { log } from 'core/src/helpers/logger';
import { ref, computed, onUnmounted, watch, type Ref } from 'vue';

import { fetchTasks, fetchTask } from 'frontend/src/tasks/tasksApi';

import type { Task, TaskType } from 'core/src/tasks/tasks.types';

type UseTaskOptions = {
  workspaceId?: string;
  taskType: TaskType;
  taskId?: Ref<string | null> | string | null;
  pollInterval?: number;
  autoStart?: boolean;
};

type UseTaskReturn = {
  task: Ref<Task | null>;
  isTaskLoading: Ref<boolean>;
  isTaskCompleted: Ref<boolean>;
  isTaskFailed: Ref<boolean>;
  isTaskRunning: Ref<boolean>;
  taskError: Ref<string | null>;
  taskProgress: Ref<Record<string, any> | null>;
  startTaskPolling: () => void;
  stopTaskPolling: () => void;
  refreshTask: () => Promise<void>;
};

/**
 * Composable for managing background tasks with polling support
 */
export const useTask = (options: UseTaskOptions): UseTaskReturn => {
  const { workspaceId, taskType, taskId, pollInterval = 10000, autoStart = true } = options;

  const task = ref<Task | null>(null);
  const taskError = ref<string | null>(null);
  let pollTimer: NodeJS.Timeout | null = null;

  // Handle reactive taskId (can be a ref or a string)
  const taskIdRef = ref(taskId);

  const isTaskLoading = computed(() => {
    return task.value?.status === 'pending' || task.value?.status === 'running';
  });

  const isTaskCompleted = computed(() => {
    return task.value?.status === 'completed';
  });

  const isTaskFailed = computed(() => {
    return task.value?.status === 'failed';
  });

  const isTaskRunning = computed(() => {
    return task.value?.status === 'running';
  });

  const taskProgress = computed(() => {
    return (task.value?.metadata as Record<string, any>)?.progress || null;
  });

  const stopTaskPolling = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const refreshTask = async (): Promise<void> => {
    try {
      taskError.value = null;

      const currentTaskId = taskIdRef?.value;
      if (currentTaskId) {
        // Fetch specific task by ID
        const fetchedTask = await fetchTask(currentTaskId);
        task.value = fetchedTask;
      } else if (workspaceId) {
        // Fetch most recent task of the specified type
        const tasks = await fetchTasks({
          workspaceId,
          taskType,
        });
        task.value = tasks?.[0] || null;
      } else {
        throw new Error('Either taskId or workspaceId must be provided');
      }
    } catch (err) {
      taskError.value = err instanceof Error ? err.message : 'Failed to fetch background task';
      log.error('TASK', 'Error refreshing background task:', err);
    }
  };

  const startTaskPolling = (): void => {
    stopTaskPolling();

    const poll = async (): Promise<void> => {
      // Stop polling if task is completed or failed
      if (isTaskCompleted.value || isTaskFailed.value) {
        stopTaskPolling();
        return;
      }

      await refreshTask();
    };

    // Poll immediately
    poll();

    // Then poll at interval
    pollTimer = setInterval(poll, pollInterval);
  };

  // Watch for taskId changes and start polling if autoStart is enabled
  watch(
    taskIdRef,
    newTaskId => {
      if (newTaskId && autoStart) {
        startTaskPolling();
      }
    },
    { immediate: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    stopTaskPolling();
  });

  return {
    task,
    isTaskLoading,
    isTaskCompleted,
    isTaskFailed,
    isTaskRunning,
    taskError,
    taskProgress,
    startTaskPolling,
    stopTaskPolling,
    refreshTask,
  };
};
