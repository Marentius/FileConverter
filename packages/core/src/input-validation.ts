/**
 * Parses a string as a positive integer (>= 1).
 *
 * @param value - The raw string value to parse
 * @param name - Human-readable parameter name for error messages
 * @returns The parsed positive integer
 * @throws Error if the value is not a valid positive integer
 */
export function parsePositiveInt(value: string, name: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, got '${value}'`);
  }

  return parsed;
}

/**
 * Parses a string as an integer within a specified range (inclusive).
 *
 * @param value - The raw string value to parse
 * @param name - Human-readable parameter name for error messages
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns The parsed integer within range
 * @throws Error if the value is not a valid integer or is out of range
 */
export function parseIntInRange(
  value: string,
  name: string,
  min: number,
  max: number
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be a valid integer, got '${value}'`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}, got ${parsed}`);
  }

  return parsed;
}
