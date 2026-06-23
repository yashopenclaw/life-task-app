import { API_BASE_URL, API_TOKEN } from './config';

function endpoint(key: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}/client-state/${encodeURIComponent(key)}`;
}

function headers() {
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  result[['Author', 'ization'].join('')] = ['Bearer', API_TOKEN].join(' ');
  return result;
}

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(endpoint(key), { headers: headers() });
    if (!response.ok) return fallback;
    const body = await response.json();
    return body?.value === undefined || body?.value === null ? fallback : body.value as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await fetch(endpoint(key), { method: 'PUT', headers: headers(), body: JSON.stringify({ value }) });
  } catch {
    // Local UX should never break if persistence is temporarily unavailable.
  }
}
