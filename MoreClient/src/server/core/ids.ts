import { randomUUID } from "crypto";

/**
 * Generate a new UUID v4 for use as a primary key.
 * Architecture target is UUID v7 (time-sortable) via ULID-as-UUID — this
 * function is the single place to swap the generator when that migration happens.
 */
export function generateId(): string {
  return randomUUID();
}
