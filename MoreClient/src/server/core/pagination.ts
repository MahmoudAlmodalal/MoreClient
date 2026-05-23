export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Encode a cursor value (e.g. a createdAt ISO string + id) to base64. */
export function encodeCursor(value: string): string {
  return Buffer.from(value).toString("base64url");
}

/** Decode a base64url cursor back to the raw value. */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf-8");
}

/** Validate and parse a cursor from a query string (returns null if absent/invalid). */
export function parseCursor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeCursor(raw);
  } catch {
    return null;
  }
}

/** Build a pagination response, slicing off the +1 sentinel item. */
export function paginate<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number,
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const last = sliced[sliced.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`)
      : null;

  return { items: sliced, nextCursor, hasMore };
}

/** Parse limit from query params with a default and max cap. */
export function parseLimit(raw: string | null | undefined, defaultVal = 20, max = 100): number {
  const n = parseInt(raw ?? "", 10);
  if (isNaN(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}
