export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function unauthorized() {
  return json({ error: "Not logged in" }, 401);
}

// Neon/pg error code for unique constraint violations.
export function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
