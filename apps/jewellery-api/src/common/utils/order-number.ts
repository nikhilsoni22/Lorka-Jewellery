import { randomBytes } from 'node:crypto';

function randomSuffix(length = 5): string {
  return randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}

/**
 * Generates a unique, human-readable order number (e.g. ORD-20260714-A3F9C).
 * `exists` should check uniqueness in the database.
 */
export async function generateUniqueOrderNumber(
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let candidate = `ORD-${datePart}-${randomSuffix()}`;
  while (await exists(candidate)) {
    candidate = `ORD-${datePart}-${randomSuffix()}`;
  }
  return candidate;
}
