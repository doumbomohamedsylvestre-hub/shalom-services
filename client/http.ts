/**
 * JSON fetch wrapper for the route handlers under /api. Not used yet: the
 * functions in client/api.ts will call it when the backend is integrated.
 * The server answers errors as { code, message } (AppError).
 */
import { ApiError } from "@/client/api";

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ApiError(data?.code ?? `HTTP_${res.status}`, data?.message ?? "Une erreur est survenue. Réessayez.");
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const http = {
  get: <T,>(url: string) => request<T>("GET", url),
  post: <T,>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T,>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T,>(url: string) => request<T>("DELETE", url),
};
