import { request } from '../../core/api';
import type { Summary, SummaryInput } from './types';
export const summariesApi = { list: () => request<Summary[]>('/summaries'), upsert: (input: SummaryInput) => request<Summary>('/summaries', { method: 'POST', body: JSON.stringify(input) }) };
