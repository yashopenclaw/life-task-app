import { request } from '../../core/api';
import type { CalorieEntry, CalorieInput, CalorieNaturalResponse, CalorieSettings, NutritionEstimate } from './types';
export const caloriesApi = {
  list: () => request<CalorieEntry[]>('/calories'),
  settings: () => request<CalorieSettings>('/calories/settings'),
  updateSettings: (input: CalorieSettings) => request<CalorieSettings>('/calories/settings', { method: 'PUT', body: JSON.stringify(input) }),
  estimate: (item: string) => request<NutritionEstimate>('/calories/estimate', { method: 'POST', body: JSON.stringify({ item }) }),
  natural: (message: string, source: 'typed' | 'voice' = 'typed', date?: string) => request<CalorieNaturalResponse>('/calories/natural', { method: 'POST', body: JSON.stringify({ message, source: source === 'voice' ? 'voice' : 'ai', date }) }),
  create: (input: CalorieInput) => request<CalorieEntry>('/calories', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/calories/${id}`, { method: 'DELETE' }),
};
