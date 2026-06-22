import { request } from '../../core/api';
import type { Task, TaskInput } from './types';
export const tasksApi = {
  list: () => request<Task[]>('/tasks'),
  create: (input: TaskInput) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<TaskInput>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
