import { request } from '../../core/api';
import type { Summary, SummaryInput, SummaryNaturalResponse } from './types';
export const summariesApi = {
  list: () => request<Summary[]>('/summaries'),
  natural: (message: string, source: 'typed' | 'voice' = 'typed') => request<SummaryNaturalResponse>('/summaries/natural', { method: 'POST', body: JSON.stringify({ message, source }) }),
  upsert: (input: SummaryInput) => request<Summary>('/summaries', { method: 'POST', body: JSON.stringify(input) }),
};
