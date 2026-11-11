import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Typed business error. Route handlers turn it into `{ code, message }` JSON
 * with the matching HTTP status; the client shows `message` (French) as-is.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError("UNAUTHORIZED", "Votre session a expiré. Reconnectez-vous.", 401);
export const forbidden = () => new AppError("FORBIDDEN", "Vous n'avez pas l'autorisation pour cette action.", 403);
export const notFound = (what = "Élément") => new AppError("NOT_FOUND", `${what} introuvable.`, 404);

/** Runs a route handler body and maps any thrown error to a JSON response. */
export async function handle<T>(fn: () => Promise<T>, init?: { status?: number }) {
  try {
    const data = await fn();
    if (data === undefined) return new NextResponse(null, { status: 204 });
    return NextResponse.json(data, init);
  } catch (err) {
    return errorResponse(err);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ code: err.code, message: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ code: "VALIDATION", message }, { status: 422 });
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ code: "BAD_JSON", message: "Requête invalide." }, { status: 400 });
  }
  console.error("[api] unexpected error", err);
  // Development only: surface the cause to make local debugging possible.
  const detail = process.env.NODE_ENV === "development" ? String((err as { cause?: unknown })?.cause ?? err) : undefined;
  return NextResponse.json({ code: "INTERNAL", message: "Une erreur est survenue. Réessayez.", detail }, { status: 500 });
}
