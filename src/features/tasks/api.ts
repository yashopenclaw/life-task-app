import { request } from '../../core/api';
import type { Task, TaskInput, TaskNaturalResponse } from './types';
export const tasksApi = {
  list: () => request<Task[]>('/tasks'),
  natural: (message: string, source: 'typed' | 'voice' = 'typed') => request<TaskNaturalResponse>('/tasks/natural', { method: 'POST', body: JSON.stringify({ message, source }) }),
  create: (input: TaskInput) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<TaskInput>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
