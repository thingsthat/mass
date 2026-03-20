import type { DatabaseClient } from 'core/src/database/types';
import type {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
} from 'core/src/tasks/tasks.types';

function newTaskId(): string {
  return crypto.randomUUID();
}

export const createTask = async (db: DatabaseClient, input: CreateTaskInput): Promise<Task> => {
  const id = newTaskId();
  const now = new Date().toISOString();
  const row = {
    id,
    workspace_id: input.workspace_id ?? null,
    task_type: input.task_type,
    status: 'pending',
    metadata: input.metadata ?? null,
    result: null,
    error: null,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db.from('tasks').insert(row).select('*').single();
  if (error) {
    throw new Error(`Failed to create background task: ${error.message}`);
  }
  return data as Task;
};

export const updateTask = async (
  db: DatabaseClient,
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> => {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.result !== undefined && { result: input.result }),
    ...(input.error !== undefined && { error: input.error }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
  };
  const { data, error } = await db
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to update background task: ${error.message}`);
  }
  return data as Task;
};

export const markTaskAsRunning = async (db: DatabaseClient, taskId: string): Promise<Task> => {
  return updateTask(db, taskId, { status: 'running' });
};

export const markTaskAsCompleted = async (
  db: DatabaseClient,
  taskId: string,
  result?: Record<string, unknown>
): Promise<Task> => {
  return updateTask(db, taskId, { status: 'completed', result: result ?? null });
};

export const markTaskAsFailed = async (
  db: DatabaseClient,
  taskId: string,
  errorMessage: string
): Promise<Task> => {
  return updateTask(db, taskId, { status: 'failed', error: errorMessage });
};

export const updateTaskProgress = async (
  db: DatabaseClient,
  taskId: string,
  progress: {
    completed?: number;
    total?: number;
    current?: number;
    stage?: string;
    personas_count?: number;
  }
): Promise<Task> => {
  const { data: existing } = await db.from('tasks').select('metadata').eq('id', taskId).single();
  const metadata = (existing?.metadata as Record<string, unknown>) ?? {};
  const updated = { ...metadata, ...progress };
  return updateTask(db, taskId, { metadata: updated });
};

export const getTaskById = async (db: DatabaseClient, taskId: string): Promise<Task | null> => {
  const { data, error } = await db.from('tasks').select('*').eq('id', taskId).single();
  if (error || !data) {
    return null;
  }
  return data as Task;
};

type FindOrCreateInput = CreateTaskInput & {
  existingTaskFilters?: {
    workspaceId: string | null;
    taskType: string;
    status: TaskStatus;
  };
};

export const findOrCreateTask = async (
  db: DatabaseClient,
  input: FindOrCreateInput
): Promise<Task> => {
  const filters = input.existingTaskFilters;
  if (filters) {
    let query = db
      .from('tasks')
      .select('*')
      .eq('task_type', filters.taskType)
      .eq('status', filters.status);
    if (filters.workspaceId !== null && filters.workspaceId !== undefined) {
      query = query.eq('workspace_id', filters.workspaceId);
    }
    const res = (await query.limit(1)) as { data: unknown[] | null; error: unknown };
    const list = res?.data && Array.isArray(res.data) ? res.data : [];
    if (list.length > 0) {
      return list[0] as Task;
    }
  }
  return createTask(db, {
    workspace_id: input.workspace_id,
    task_type: input.task_type,
    metadata: input.metadata,
  });
};
