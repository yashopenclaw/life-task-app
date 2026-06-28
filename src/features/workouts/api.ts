import { request } from '../../core/api';
import type { WorkoutEntry, WorkoutInput, WorkoutNaturalResponse } from './types';

export const workoutsApi = {
  list: () => request<WorkoutEntry[]>('/workouts'),
  natural: (message: string, source: 'typed' | 'voice' = 'typed', date?: string) => request<WorkoutNaturalResponse>('/workouts/natural', {
    method: 'POST',
    body: JSON.stringify({ message, source: source === 'voice' ? 'voice' : 'ai', date }),
  }),
  create: (input: WorkoutInput) => request<WorkoutEntry>('/workouts', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/workouts/${id}`, { method: 'DELETE' }),
};
