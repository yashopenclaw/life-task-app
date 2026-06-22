import { request } from '../../core/api';
import type { CalorieEntry, CalorieInput } from './types';
export const caloriesApi = {
  list: () => request<CalorieEntry[]>('/calories'),
  create: (input: CalorieInput) => request<CalorieEntry>('/calories', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/calories/${id}`, { method: 'DELETE' }),
};
