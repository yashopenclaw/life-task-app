import { request } from '../../core/api';
import type { CalorieEntry, CalorieInput, CalorieNaturalResponse, NutritionEstimate } from './types';
export const caloriesApi = {
  list: () => request<CalorieEntry[]>('/calories'),
  estimate: (item: string) => request<NutritionEstimate>('/calories/estimate', { method: 'POST', body: JSON.stringify({ item }) }),
  natural: (message: string, source: 'typed' | 'voice' = 'typed') => request<CalorieNaturalResponse>('/calories/natural', { method: 'POST', body: JSON.stringify({ message, source: source === 'voice' ? 'voice' : 'ai' }) }),
  create: (input: CalorieInput) => request<CalorieEntry>('/calories', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/calories/${id}`, { method: 'DELETE' }),
};
