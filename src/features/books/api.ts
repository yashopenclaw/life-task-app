import { request } from '../../core/api';
import type { Book, BookInput } from './types';
export const booksApi = {
  list: () => request<Book[]>('/books'),
  create: (input: BookInput) => request<Book>('/books', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<BookInput>) => request<Book>(`/books/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/books/${id}`, { method: 'DELETE' }),
};
