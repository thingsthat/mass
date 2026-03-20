export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TaskType = 'create_personas' | 'report' | 'simulation_run' | string;

export type Task = {
  id: string;
  workspace_id: string | null;
  task_type: TaskType;
  status: TaskStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CreateTaskInput = {
  workspace_id: string | null;
  task_type: TaskType;
  metadata?: Record<string, unknown> | null;
};

export type UpdateTaskInput = {
  status?: TaskStatus;
  result?: Record<string, unknown> | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
};
