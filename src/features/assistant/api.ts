import { request } from '../../core/api';
import type { AssistantReply, AssistantSendInput } from './types';

export const assistantApi = {
  send: (input: AssistantSendInput) => request<AssistantReply>('/assistant/message', { method: 'POST', body: JSON.stringify(input) }),
};
