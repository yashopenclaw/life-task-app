import { request } from '../../core/api';
import type { CalorieEntry, CalorieInput, NutritionEstimate } from './types';
export const caloriesApi = {
  list: () => request<CalorieEntry[]>('/calories'),
  estimate: (item: string) => request<NutritionEstimate>('/calories/estimate', { method: 'POST', body: JSON.stringify({ item }) }),
  create: (input: CalorieInput) => request<CalorieEntry>('/calories', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/calories/${id}`, { method: 'DELETE' }),
};
