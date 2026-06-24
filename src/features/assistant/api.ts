import { API_BASE_URL } from '../../core/config';
import { request } from '../../core/api';
import type { AssistantReply, AssistantSendInput } from './types';

function endpoint(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}


export const assistantApi = {
  send: (input: AssistantSendInput) => request<AssistantReply>('/assistant/message', { method: 'POST', body: JSON.stringify(input) }),
  async stream(input: AssistantSendInput, onDelta: (delta: string) => void): Promise<string> {
    const response = await fetch(endpoint('/assistant/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    if (!response.body || typeof response.body.getReader !== 'function') {
      const fallback = await assistantApi.send(input);
      onDelta(fallback.text);
      return fallback.text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let errorText = '';

    function consumeBlock(block: string) {
      const event = block.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim() || 'message';
      const dataLines = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim());
      if (!dataLines.length) return;
      const dataText = dataLines.join('\n');
      if (event === 'delta') {
        const parsed = JSON.parse(dataText);
        const delta = String(parsed.delta || '');
        if (delta) {
          fullText += delta;
          onDelta(delta);
        }
      } else if (event === 'error') {
        try { errorText = String(JSON.parse(dataText).error || dataText); } catch { errorText = dataText; }
      }
    }

    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) consumeBlock(part);
      }
      if (done) break;
    }
    if (buffer.trim()) consumeBlock(buffer);
    if (errorText && !fullText) throw new Error(errorText);
    return fullText;
  },
  transcribe: async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'audio.m4a', type: 'audio/m4a' } as any);
    const response = await fetch(endpoint('/assistant/transcribe'), { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`Transcribe failed: ${response.status}`);
    const data = await response.json();
    return data.text || '';
  },
  title: (message: string) => request<{ text: string }>('/assistant/title', { method: 'POST', body: JSON.stringify({ message, source: 'typed' }) }).then(r => r.text),
};
