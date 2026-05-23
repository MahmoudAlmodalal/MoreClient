// Tiny typed fetch wrapper. All calls are relative to `/api`, which the Vite
// dev server proxies to the FastAPI backend on :8000 — so there is no CORS
// concern and no base-URL env var to configure.

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string") detail = body.detail;
  } catch {
    /* non-JSON error body — keep the default message */
  }
  throw new ApiError(res.status, detail);
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) return parseError(res);
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: { Accept: "application/json" } });
  return handle<T>(res);
}

export async function apiJson<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH",
  body?: unknown,
): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, "POST", body);
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, "PUT", body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  return handle<T>(res);
}

// Multipart upload. Do NOT set Content-Type manually — the browser must add
// the multipart boundary itself. The backend expects the field name `file`.
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(BASE + path, { method: "POST", body: form });
  return handle<T>(res);
}
