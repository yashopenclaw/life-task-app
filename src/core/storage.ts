import { API_BASE_URL } from './config';

function endpoint(key: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}/client-state/${encodeURIComponent(key)}`;
}

const headers = { 'Content-Type': 'application/json' };

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(endpoint(key), { headers });
    if (!response.ok) return fallback;
    const body = await response.json();
    return body?.value === undefined || body?.value === null ? fallback : body.value as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await fetch(endpoint(key), { method: 'PUT', headers, body: JSON.stringify({ value }) });
  } catch {
    // Local UX should never break if persistence is temporarily unavailable.
  }
}
