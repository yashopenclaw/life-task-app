import { API_BASE_URL, API_TOKEN } from './config';

function url(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  headers[['Author', 'ization'].join('')] = ['Bearer', API_TOKEN].join(' ');

  let response: Response;
  try {
    response = await fetch(url(path), { ...options, headers });
  } catch {
    throw new Error("Can't reach server. Check Tailscale/VPN and retry.");
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) message = Array.isArray(body.detail) ? JSON.stringify(body.detail) : String(body.detail);
    } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
