import { request } from '../../core/api';
import type { Note, NoteInput } from './types';
export const notesApi = { list: () => request<Note[]>('/notes'), create: (input: NoteInput) => request<Note>('/notes', { method: 'POST', body: JSON.stringify(input) }), remove: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }) };
