import { request } from '../../core/api';
import type { Brief } from './types';
export const briefApi = { latest: () => request<Brief>('/brief') };
