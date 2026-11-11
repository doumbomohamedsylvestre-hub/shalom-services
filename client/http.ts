/**
 * JSON fetch wrapper for the route handlers under /api, used by client/api.ts.
 * The server answers errors as { code, message } (server/errors.ts AppError).
 */

/** Error shape returned by the API (AppError -> { code, message }). */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

/** Session expired or revoked (e.g. account deactivated): back to the login page. */
function toLogin() {
  if (typeof window === "undefined") return;
  const next = window.location.pathname + window.location.search;
  // Full reload on purpose: drops every cached query of the expired session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/connexion?next=${encodeURIComponent(next)}`);
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("NETWORK", "Connexion impossible. Vérifiez votre accès à Internet.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    if (res.status === 401) toLogin();
    throw new ApiError(data?.code ?? `HTTP_${res.status}`, data?.message ?? "Une erreur est survenue. Réessayez.", res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const http = {
  get: <T,>(url: string) => request<T>("GET", url),
  post: <T,>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T,>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T,>(url: string) => request<T>("DELETE", url),
};
