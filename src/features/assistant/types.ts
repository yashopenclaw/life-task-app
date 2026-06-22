export type AssistantSendInput = { message: string; source: 'typed' | 'voice' };
export type AssistantReply = { text: string; source: string; suggestions: string[] };
export type ChatLine = { id: string; role: 'user' | 'assistant'; text: string; source?: string };
