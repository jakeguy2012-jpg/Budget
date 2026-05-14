const BASE = "/api";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message);
  }

  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  return res.json();
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  const res = await apiFetch(path, { method: "POST", body: JSON.stringify(data) });
  return res.json();
}

export async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  const res = await apiFetch(path, { method: "PATCH", body: JSON.stringify(data) });
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch(path, { method: "DELETE" });
}
